/**
 * مرحلہ 10 — امتحانات کے Server Actions (نیا امتحان / نمبر درج کرنا)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط نمبر دوبارہ لکھ کر درست ہو جاتا ہے (upsert) — نتائج کبھی حذف نہیں ہوتے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  getMyMadrasa,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";

type ActionResult = { ok: true } | { error: string };
type AddResult = { ok: true; id: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function notFuture(value: string): boolean {
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

/** مضامین کی فہرست — اردو کوما (،) اور انگریزی کوما (,) دونوں چلتے ہیں */
function parseSubjects(value: string): string[] {
  const parts = value
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...new Set(parts)];
}

/** آڈٹ لاگ میں اندراج — ناکام ہو تو اصل کام نہیں رکتا */
async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  madrasaId: string,
  userId: string,
  action: string,
  details: Record<string, string>,
) {
  try {
    await supabase.from("audit_log").insert({
      madrasa_id: madrasaId,
      user_id: userId,
      action,
      details,
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }
}

/** نیا امتحان بنائیں */
export async function addExam(formData: FormData): Promise<AddResult> {
  const name = clean(formData.get("name"), 200);
  const examDate = clean(formData.get("exam_date"), 10);
  const department = clean(formData.get("department"), 20);
  const section = clean(formData.get("section"), 20);
  const className = clean(formData.get("class_name"), 100);
  const subjects = parseSubjects(clean(formData.get("subjects"), 1000));

  if (!name) return { error: "امتحان کا نام ضروری ہے۔" };
  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { error: "شعبہ درست منتخب کریں (حفظ، ناظرہ یا درسِ نظامی)۔" };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: "شعبہ (بنین / بنات) درست منتخب کریں۔" };
  if (!validDate(examDate)) return { error: "امتحان کی تاریخ درست نہیں ہے۔" };
  if (!notFuture(examDate))
    return { error: "امتحان کی تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (subjects.length === 0)
    return { error: "کم از کم ایک مضمون لکھیں (کوما سے الگ کریں)۔" };
  if (subjects.length > 10)
    return { error: "زیادہ سے زیادہ 10 مضامین ہو سکتے ہیں۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 54 — بند شعبے میں امتحان نہیں بن سکتا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(section as SectionId))
    return { error: "اس شعبے میں امتحان بنانے کی اجازت نہیں ہے۔" };

  const { data, error } = await supabase
    .from("exams")
    .insert({
      madrasa_id: mine.madrasaId,
      name,
      exam_date: examDate,
      department: department as DepartmentId,
      section: section as SectionId,
      class_name: className || null,
      subjects,
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "امتحان نہیں بن سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "exam_created", {
    exam_id: data.id as string,
    name,
  });

  revalidatePath("/departments/exams");
  return { ok: true, id: data.id as string };
}

/**
 * نمبر درج کریں — فارم میں ہر خانے کا نام marks_<طالبہ کا id>_<مضمون کا نمبر>
 * خالی خانہ چھوڑا جائے تو اس مضمون کا نمبر نہیں بدلتا؛ 0 سے 100 تک عدد درست ہے۔
 */
export async function saveMarks(
  examId: string,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // صرف اپنے مدرسے کا امتحان
  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, subjects, department, section, class_name")
    .eq("id", examId)
    .eq("madrasa_id", mine.madrasaId)
    .single();

  if (examError || !exam) {
    return { error: "امتحان نہیں ملا۔" };
  }

  const subjects = (exam.subjects as string[]) ?? [];
  if (subjects.length === 0) {
    return { error: "اس امتحان میں کوئی مضمون نہیں ہے۔" };
  }
  // مرحلہ 54 — بند شعبے کے امتحان میں نمبر نہیں درج ہو سکتے
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section as SectionId))
    return { error: "اس شعبے کے امتحان میں نمبر درج کرنے کی اجازت نہیں ہے۔" };

  // اس امتحان کی طالبات — اسی شعبے کی فعال طالبات (جماعت لکھی ہو تو وہی جماعت)
  let studentQuery = supabase
    .from("students")
    .select("id")
    .eq("madrasa_id", mine.madrasaId)
    .eq("department", exam.department as string)
    .eq("status", "active");
  // مرحلہ 52 — صرف اسی شعبے کی طالبات (پرانا امتحان ہو تو شعبہ خالی
  // ہو سکتا ہے — اس صورت میں یہ جانچ نہیں لگتی)
  if (exam.section) {
    studentQuery = studentQuery.eq("section", exam.section as string);
  }
  if (exam.class_name) {
    studentQuery = studentQuery.eq("class_name", exam.class_name as string);
  }
  const { data: students } = await studentQuery;
  const allowedIds = new Set((students ?? []).map((s) => s.id as string));

  const rows: {
    madrasa_id: string;
    exam_id: string;
    student_id: string;
    subject: string;
    marks_obtained: number;
  }[] = [];

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("marks_")) continue;
    const rest = key.slice("marks_".length);
    const sep = rest.lastIndexOf("_");
    if (sep <= 0) continue;
    const studentId = rest.slice(0, sep);
    const subjectIndex = Number(rest.slice(sep + 1));
    if (!allowedIds.has(studentId)) continue;
    if (!Number.isInteger(subjectIndex) || subjectIndex < 0 || subjectIndex >= subjects.length)
      continue;
    const raw = typeof value === "string" ? value.trim() : "";
    if (raw === "") continue; // خالی خانہ = نمبر نہیں بدلنا
    const marks = Number(raw);
    if (!Number.isInteger(marks) || marks < 0 || marks > 100) {
      return { error: "نمبر 0 سے 100 تک پورا عدد ہونا چاہیے۔" };
    }
    rows.push({
      madrasa_id: mine.madrasaId,
      exam_id: examId,
      student_id: studentId,
      subject: subjects[subjectIndex],
      marks_obtained: marks,
    });
  }

  if (rows.length === 0) {
    return { error: "کوئی نمبر نہیں لکھا گیا۔" };
  }

  const { error } = await supabase
    .from("exam_results")
    .upsert(rows, { onConflict: "madrasa_id,exam_id,student_id,subject" });

  if (error) {
    return { error: "نمبر محفوظ نہیں ہو سکے۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "marks_saved", {
    exam_id: examId,
    count: String(rows.length),
  });

  revalidatePath(`/departments/exams/${examId}`);
  return { ok: true };
}
