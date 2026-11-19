/**
 * CSV درآمد — نمبر ایک ساتھ (ایک امتحان)
 *
 * دو مرحلے: پہلے پیش نظارہ (کچھ محفوظ نہیں ہوتا)، پھر تصدیق۔
 * تصدیق پر ہر قطار دوبارہ جانچی جاتی ہے — کلائنٹ سے آنے والے
 * ڈیٹا پر کبھی بھروسا نہیں۔ صرف اپنے مدرسے میں درآمد؛ فائل سے
 * مدرسے کا id کبھی نہیں لیا جاتا۔ مالک/ایڈمن کے لیے ہے۔
 * نمبر upsert ہوتے ہیں (saveMarks جیسا) — غلط نمبر دوبارہ
 * لکھ کر درست ہو جاتا ہے، نتیجہ کبھی حذف نہیں ہوتا۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
} from "@/lib/permissions";
import { getMyMadrasa, type SectionId } from "@/lib/students";
import { isLang, t, type Lang } from "@/i18n/dictionary";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  duplicateKey,
  marksImportHeaders,
  parseCsv,
  validateMarksRow,
  type CleanMarksRow,
} from "@/lib/csvMarksImport";

function formLang(formData: FormData): Lang {
  const v = typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function writeAudit(
  supabase: ServerClient,
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

/** مالک یا ایڈمن + امتحانات ماڈیول کی اجازت — دونوں لازم */
async function canImport(
  supabase: ServerClient,
): Promise<{ madrasaId: string; userId: string } | null> {
  const mine = await getMyMadrasa(supabase);
  if (!mine) return null;
  const [admin, owner, moduleOk] = await Promise.all([
    isAppAdmin(supabase),
    isMadrasaOwner(supabase),
    isModuleAllowedForMe(supabase, "exams"),
  ]);
  if (!(admin || owner) || !moduleOk) return null;
  return mine;
}

interface ExamHead {
  id: string;
  name: string;
  subjects: string[];
  section: string | null;
}

async function loadExam(
  supabase: ServerClient,
  madrasaId: string,
  examId: string,
): Promise<ExamHead | null> {
  const { data, error } = await supabase
    .from("exams")
    .select("id, name, subjects, section")
    .eq("id", examId)
    .eq("madrasa_id", madrasaId)
    .single();
  if (error || !data) return null;
  const subjects = (data as { subjects: unknown }).subjects;
  return {
    id: (data as { id: string }).id,
    name: (data as { name: string }).name ?? "",
    subjects: Array.isArray(subjects) ? (subjects as string[]) : [],
    section: (data as { section: string | null }).section ?? null,
  };
}

/** نام + والد کا نام → طالبات کے id (اپنے مدرسے کی) */
async function loadStudentMap(
  supabase: ServerClient,
  madrasaId: string,
): Promise<Map<string, string[]>> {
  const { data } = await supabase
    .from("students")
    .select("id, name, father_name")
    .eq("madrasa_id", madrasaId);
  const map = new Map<string, string[]>();
  for (const s of (data ?? []) as {
    id: string;
    name: string;
    father_name: string;
  }[]) {
    const key = duplicateKey(s.name ?? "", s.father_name ?? "");
    const list = map.get(key) ?? [];
    list.push(s.id);
    map.set(key, list);
  }
  return map;
}

/** اس امتحان میں پہلے سے ڈلے ہوئے نمبر — "طالبہ|مضمون" */
async function loadExistingMarks(
  supabase: ServerClient,
  madrasaId: string,
  examId: string,
): Promise<Set<string>> {
  const { data } = await supabase
    .from("exam_results")
    .select("student_id, subject")
    .eq("madrasa_id", madrasaId)
    .eq("exam_id", examId);
  return new Set(
    ((data ?? []) as { student_id: string; subject: string }[]).map(
      (r) => `${r.student_id}|${r.subject}`,
    ),
  );
}

export interface PreviewErrorRow {
  row: number;
  reason: string;
}
export interface PreviewAlreadyRow {
  row: number;
  name: string;
  fatherName: string;
  subjects: string[];
}
export type PreviewResult =
  | {
      ok: true;
      examId: string;
      examName: string;
      valid: CleanMarksRow[];
      errors: PreviewErrorRow[];
      already: PreviewAlreadyRow[];
      totalRows: number;
    }
  | { error: string };

/** پہلا مرحلہ — فائل پڑھیں، جانچیں، پیش نظارہ دیں (کچھ محفوظ نہیں ہوتا) */
export async function previewMarksImport(
  formData: FormData,
): Promise<PreviewResult> {
  const lang = formLang(formData);
  const supabase = await createClient();
  const mine = await canImport(supabase);
  if (!mine) return { error: t(lang, "common.not_allowed") };

  const examId =
    typeof formData.get("exam_id") === "string"
      ? (formData.get("exam_id") as string).trim()
      : "";
  if (!examId) return { error: t(lang, "exam.marks_import.err.exam") };
  const exam = await loadExam(supabase, mine.madrasaId, examId);
  if (!exam) return { error: t(lang, "exam.err.not_found") };
  if (exam.subjects.length === 0)
    return { error: t(lang, "exam.err.no_subjects") };
  // saveMarks جیسا — بند شعبے کے امتحان میں نمبر نہیں درج ہو سکتے
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section as SectionId))
    return { error: t(lang, "exam.err.section_denied_marks") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: t(lang, "exam.marks_import.err.no_file") };
  if (file.size > IMPORT_MAX_BYTES)
    return { error: t(lang, "exam.marks_import.err.file_big") };

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: t(lang, "exam.marks_import.err.parse_failed") };
  }
  const records = parseCsv(text);
  if (records.length === 0)
    return { error: t(lang, "exam.marks_import.err.no_rows") };
  const header = records[0].map((h) => h.trim().toLowerCase());
  const expected = marksImportHeaders(exam.subjects).map((h) =>
    h.toLowerCase(),
  );
  const headerOk =
    header.length === expected.length &&
    expected.every((h, i) => header[i] === h);
  if (!headerOk)
    return { error: t(lang, "exam.marks_import.err.bad_header") };

  const dataRecords = records
    .slice(1)
    .filter((r) => r.some((c) => c.trim() !== ""));
  if (dataRecords.length === 0)
    return { error: t(lang, "exam.marks_import.err.no_rows") };
  if (dataRecords.length > IMPORT_MAX_ROWS)
    return { error: t(lang, "exam.marks_import.err.too_many") };

  const studentMap = await loadStudentMap(supabase, mine.madrasaId);
  const existingMarks = await loadExistingMarks(
    supabase,
    mine.madrasaId,
    exam.id,
  );

  const valid: CleanMarksRow[] = [];
  const errors: PreviewErrorRow[] = [];
  const already: PreviewAlreadyRow[] = [];
  const seenStudents = new Set<string>();

  dataRecords.forEach((fields, idx) => {
    const rowNumber = idx + 2; // سرخی = قطار 1
    const checked = validateMarksRow(fields, rowNumber, exam.subjects);
    if ("errorKey" in checked) {
      errors.push({ row: rowNumber, reason: t(lang, checked.errorKey) });
      return;
    }
    const r = checked.row;
    const matches = studentMap.get(duplicateKey(r.name, r.fatherName)) ?? [];
    if (matches.length === 0) {
      errors.push({
        row: rowNumber,
        reason: t(lang, "exam.marks_import.err.student_not_found"),
      });
      return;
    }
    if (matches.length > 1) {
      errors.push({
        row: rowNumber,
        reason: t(lang, "exam.marks_import.err.student_ambiguous"),
      });
      return;
    }
    const studentId = matches[0];
    if (seenStudents.has(studentId)) {
      errors.push({
        row: rowNumber,
        reason: t(lang, "exam.marks_import.err.duplicate_student"),
      });
      return;
    }
    seenStudents.add(studentId);
    // پہلے سے ڈلے ہوئے مضامین — صرف اطلاع (تصدیق پر درست ہو جائیں گے)
    const present = r.marks
      .filter((m) => existingMarks.has(`${studentId}|${m.subject}`))
      .map((m) => m.subject);
    if (present.length > 0) {
      already.push({
        row: rowNumber,
        name: r.name,
        fatherName: r.fatherName,
        subjects: present,
      });
    }
    valid.push(r);
  });

  return {
    ok: true,
    examId: exam.id,
    examName: exam.name,
    valid,
    errors,
    already,
    totalRows: dataRecords.length,
  };
}

export type ConfirmResult =
  | {
      ok: true;
      examId: string;
      examName: string;
      added: number;
      skipped: PreviewErrorRow[];
    }
  | { error: string };

/** دوسرا مرحلہ — درست قطاریں ڈالیں (ہر قطار دوبارہ جانچ کر) */
export async function confirmMarksImport(
  formData: FormData,
): Promise<ConfirmResult> {
  const lang = formLang(formData);
  const supabase = await createClient();
  const mine = await canImport(supabase);
  if (!mine) return { error: t(lang, "common.not_allowed") };

  const examId =
    typeof formData.get("exam_id") === "string"
      ? (formData.get("exam_id") as string).trim()
      : "";
  if (!examId) return { error: t(lang, "exam.marks_import.err.exam") };
  const exam = await loadExam(supabase, mine.madrasaId, examId);
  if (!exam) return { error: t(lang, "exam.err.not_found") };
  if (exam.subjects.length === 0)
    return { error: t(lang, "exam.err.no_subjects") };
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section as SectionId))
    return { error: t(lang, "exam.err.section_denied_marks") };

  let rows: CleanMarksRow[];
  try {
    const raw = formData.get("rows");
    rows = typeof raw === "string" ? (JSON.parse(raw) as CleanMarksRow[]) : [];
    if (
      !Array.isArray(rows) ||
      rows.length === 0 ||
      rows.length > IMPORT_MAX_ROWS
    )
      return { error: t(lang, "exam.marks_import.err.confirm_failed") };
  } catch {
    return { error: t(lang, "exam.marks_import.err.confirm_failed") };
  }

  const studentMap = await loadStudentMap(supabase, mine.madrasaId);

  let added = 0;
  const skipped: PreviewErrorRow[] = [];
  const seenInBatch = new Set<string>();

  for (const r of rows) {
    const rowNumber = typeof r.row === "number" ? r.row : 0;
    // قطار دوبارہ بنائیں (کلائنٹ کے ڈیٹا پر بھروسا نہیں)
    const bySubject = new Map(
      (Array.isArray(r.marks) ? r.marks : []).map((m) => [
        m.subject,
        String(m.marks ?? ""),
      ]),
    );
    const fields: string[] = [
      r.name ?? "",
      r.fatherName ?? "",
      ...exam.subjects.map((s) => bySubject.get(s) ?? ""),
    ];
    const checked = validateMarksRow(fields, rowNumber, exam.subjects);
    if ("errorKey" in checked) {
      skipped.push({ row: rowNumber, reason: t(lang, checked.errorKey) });
      continue;
    }
    const clean = checked.row;
    const matches =
      studentMap.get(duplicateKey(clean.name, clean.fatherName)) ?? [];
    if (matches.length === 0) {
      skipped.push({
        row: rowNumber,
        reason: t(lang, "exam.marks_import.err.student_not_found"),
      });
      continue;
    }
    if (matches.length > 1) {
      skipped.push({
        row: rowNumber,
        reason: t(lang, "exam.marks_import.err.student_ambiguous"),
      });
      continue;
    }
    const studentId = matches[0];
    if (seenInBatch.has(studentId)) {
      skipped.push({
        row: rowNumber,
        reason: t(lang, "exam.marks_import.err.duplicate_student"),
      });
      continue;
    }
    seenInBatch.add(studentId);

    // saveMarks جیسا upsert — ہر طالبہ الگ، تاکہ ایک کی غلطی
    // دوسرے کو نہ روکے
    const upsertRows = clean.marks.map((m) => ({
      madrasa_id: mine.madrasaId,
      exam_id: exam.id,
      student_id: studentId,
      subject: m.subject,
      marks_obtained: m.marks,
    }));
    const { error } = await supabase
      .from("exam_results")
      .upsert(upsertRows, {
        onConflict: "madrasa_id,exam_id,student_id,subject",
      });
    if (error) {
      skipped.push({
        row: rowNumber,
        reason: t(lang, "exam.err.marks_save_failed"),
      });
      continue;
    }
    added += upsertRows.length;
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "marks_imported", {
    exam_id: exam.id,
    exam_name: exam.name,
    added: String(added),
    skipped: String(skipped.length),
  });

  revalidatePath(`/departments/exams/${exam.id}`);
  revalidatePath("/departments/exams");
  revalidatePath("/");
  return { ok: true, examId: exam.id, examName: exam.name, added, skipped };
}
