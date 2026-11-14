/**
 * مرحلہ 38 — حفظ کی پیش رفت کے Server Actions (اضافہ / منسوخ کرنا)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف status = 'voided' (منسوخ) کیا جاتا ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
} from "@/lib/permissions";
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
import { isLang, t, type Lang } from "@/i18n/dictionary";

/** مرحلہ 107 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

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

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
  lang: Lang,
): { fields: HifzFields } | { error: string } {
  const studentId = clean(formData.get("student_id"), 100);
  const progressDate = clean(formData.get("progress_date"), 10);
  const kind = clean(formData.get("kind"), 20);
  const portion = clean(formData.get("portion"), 200);
  const quality = clean(formData.get("quality"), 20);
  const listenedBy = clean(formData.get("listened_by"), 100);
  const note = clean(formData.get("note"), 500);

  if (!studentId) return { error: t(lang, "hifz.err.student_unknown") };
  if (!isValidDate(progressDate))
    return { error: t(lang, "hifz.err.date_invalid") };
  if (progressDate > todayInKarachi())
    return { error: t(lang, "hifz.err.date_future") };
  if (!HIFZ_KINDS.includes(kind as HifzKind))
    return { error: t(lang, "hifz.err.kind_invalid") };
  if (!portion) return { error: t(lang, "hifz.err.portion_required") };
  if (!HIFZ_QUALITIES.includes(quality as HifzQuality))
    return { error: t(lang, "hifz.err.quality_invalid") };

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
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "academic"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // طالبہ اپنے مدرسے کی فعال اور حفظ شعبے کی ہونی چاہیے
  const { data: student } = await supabase
    .from("students")
    .select("id, name, department, section")
    .eq("id", f.studentId)
    .eq("status", "active")
    .single();
  if (!student) {
    return { error: t(lang, "hifz.err.student_not_found") };
  }
  if (student.department !== "hifz") {
    return { error: t(lang, "hifz.err.not_hifz") };
  }
  // مرحلہ 54 — بند شعبے کی طالبہ کی پیش رفت درج نہیں ہو سکے گی
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      ((student as { section?: string | null }).section ?? "banat") as SectionId,
    )
  )
    return { error: t(lang, "hifz.err.section_denied") };

  // سننے والا استاد دیا ہو تو وہ اپنے مدرسے کا فعال استاد ہونا چاہیے
  if (f.listenedBy) {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("id", f.listenedBy)
      .eq("status", "active")
      .single();
    if (!teacher) {
      return { error: t(lang, "hifz.err.teacher_invalid") };
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
    return { error: t(lang, "hifz.err.save_failed") };
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
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "academic"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("hifz_progress")
    .update({ status: "voided" })
    .eq("id", id)
    .eq("student_id", studentId)
    .eq("status", "active")
    .select("kind, portion")
    .single();

  if (error || !data) {
    return { error: t(lang, "hifz.err.void_failed") };
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
