/**
 * مرحلہ 38 — حفظ کی پیش رفت کے Server Actions (اضافہ / منسوخ کرنا)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف status = 'voided' (منسوخ) کیا جاتا ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyMadrasa,
  type SectionId,
} from "@/lib/students";
import { todayInKarachi } from "@/lib/attendance";
import {
  HIFZ_KINDS,
  HIFZ_QUALITIES,
  type HifzKind,
  type HifzQuality,
} from "@/lib/hifz";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

interface HifzFields {
  studentId: string;
  progressDate: string;
  kind: HifzKind;
  portion: string;
  quality: HifzQuality;
  listenedBy: string | null;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: HifzFields } | { error: string } {
  const studentId = clean(formData.get("student_id"), 100);
  const progressDate = clean(formData.get("progress_date"), 10);
  const kind = clean(formData.get("kind"), 20);
  const portion = clean(formData.get("portion"), 200);
  const quality = clean(formData.get("quality"), 20);
  const listenedBy = clean(formData.get("listened_by"), 100);
  const note = clean(formData.get("note"), 500);

  if (!studentId) return { error: "طالبہ معلوم نہیں ہوئی۔" };
  if (!isValidDate(progressDate))
    return { error: "تاریخ درست لکھیں۔" };
  if (progressDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!HIFZ_KINDS.includes(kind as HifzKind))
    return { error: "قسم درست منتخب کریں (سبق، سبقی یا منزل)۔" };
  if (!portion) return { error: "حصہ لکھنا ضروری ہے — مثلاً پارہ 5۔" };
  if (!HIFZ_QUALITIES.includes(quality as HifzQuality))
    return { error: "کیفیت درست منتخب کریں (اچھا، اوسط یا کمزور)۔" };

  return {
    fields: {
      studentId,
      progressDate,
      kind: kind as HifzKind,
      portion,
      quality: quality as HifzQuality,
      listenedBy: listenedBy || null,
      note,
    },
  };
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

/** حفظ کی پیش رفت کا اندراج شامل کریں — صرف حفظ شعبے کی فعال طالبہ کے لیے */
export async function addHifzProgress(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // طالبہ اپنے مدرسے کی فعال اور حفظ شعبے کی ہونی چاہیے
  const { data: student } = await supabase
    .from("students")
    .select("id, name, department, section")
    .eq("id", f.studentId)
    .eq("status", "active")
    .single();
  if (!student) {
    return { error: "طالبہ نہیں ملی — پہلے طلبہ کے ریکارڈ میں دیکھیں۔" };
  }
  if (student.department !== "hifz") {
    return { error: "حفظ کی پیش رفت صرف حفظ شعبے کی طالبات کے لیے ہے۔" };
  }
  // مرحلہ 54 — بند شعبے کی طالبہ کی پیش رفت درج نہیں ہو سکے گی
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      ((student as { section?: string | null }).section ?? "banat") as SectionId,
    )
  )
    return { error: "اس شعبے کی طالبہ کی پیش رفت درج کرنے کی اجازت نہیں ہے۔" };

  // سننے والا استاد دیا ہو تو وہ اپنے مدرسے کا فعال استاد ہونا چاہیے
  if (f.listenedBy) {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", f.listenedBy)
      .eq("status", "active")
      .single();
    if (!teacher) {
      return { error: "سننے والا استاد درست منتخب کریں۔" };
    }
  }

  const { data, error } = await supabase
    .from("hifz_progress")
    .insert({
      madrasa_id: mine.madrasaId,
      student_id: f.studentId,
      progress_date: f.progressDate,
      kind: f.kind,
      portion: f.portion,
      quality: f.quality,
      listened_by: f.listenedBy,
      note: f.note || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "hifz_progress_created",
    {
      student_id: f.studentId,
      name: student.name as string,
      kind: f.kind,
      portion: f.portion,
    },
  );

  revalidatePath(`/departments/academic/${f.studentId}`);
  return { ok: true };
}

/** حفظ کی پیش رفت کا اندراج منسوخ کریں — ریکارڈ حذف نہیں ہوتا */
export async function voidHifzProgress(
  id: string,
  studentId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  const { data, error } = await supabase
    .from("hifz_progress")
    .update({ status: "voided" })
    .eq("id", id)
    .eq("student_id", studentId)
    .eq("status", "active")
    .select("kind, portion")
    .single();

  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "hifz_progress_voided",
    {
      student_id: studentId,
      kind: data.kind as string,
      portion: data.portion as string,
    },
  );

  revalidatePath(`/departments/academic/${studentId}`);
  return { ok: true };
}
