/**
 * ترتیبات — تعلیمی سال شروع کرنا (migration 056)
 * صرف مدرسے کا مالک یا ایڈمن۔ سال بنتے ہی ہر فعال طالبہ کے لیے
 * اس سال میں اس کی موجودہ جماعت کا ریکارڈ بن جاتا ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { yearRangesOverlap } from "@/lib/academicYears";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import { isLang, t, type Lang } from "@/i18n/dictionary";

function formLang(formData: FormData): Lang {
  const v = typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

type YearResult = { ok: true; count: number } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

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

/**
 * نیا تعلیمی سال شروع کریں — صرف مالک یا ایڈمن۔
 * شروع کی تاریخ یکم شوال کی عیسوی تاریخ ہوتی ہے؛ ختم کی تاریخ رمضان
 * کے آخر (شروع سے 353 دن بعد) خود لگ جاتی ہے — اس مرحلے میں ختم کی
 * تاریخ سے کوئی حساب نہیں ہوتا، موجودہ سال is_current سے طے ہوتا ہے۔
 */
export async function createAcademicYear(
  formData: FormData,
): Promise<YearResult> {
  const lang = formLang(formData);
  const label = clean(formData.get("label"), 20);
  const startDate = clean(formData.get("start_date"), 10);
  if (!label) return { error: t(lang, "settings.year.err.label") };
  if (!validDate(startDate))
    return { error: t(lang, "settings.year.err.date") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  const owner = await isMadrasaOwner(supabase);
  const admin = await isAppAdmin(supabase);
  if (!owner && !admin) return { error: t(lang, "common.not_allowed") };

  // ایک وقت میں ایک سال موجودہ — پہلے سے ہو تو نیا نہیں بنے گا
  const { data: existing } = await supabase
    .from("academic_years")
    .select("id")
    .eq("madrasa_id", mine.madrasaId)
    .eq("is_current", true)
    .limit(1);
  if (existing && existing.length > 0)
    return { error: t(lang, "settings.year.err.exists") };

  // ختم کی تاریخ: رمضان کا آخر — شروع سے 353 دن بعد
  // (اگلے یکم شوال سے ایک دن پہلے)
  const end = new Date(`${startDate}T00:00:00`);
  end.setDate(end.getDate() + 353);
  const endDate = end.toISOString().slice(0, 10);

  const { error: unsetError } = await supabase
    .from("academic_years")
    .update({ is_current: false })
    .eq("madrasa_id", mine.madrasaId)
    .eq("is_current", true);
  if (unsetError) return { error: t(lang, "settings.year.err.failed") };

  const { data: year, error: insertError } = await supabase
    .from("academic_years")
    .insert({
      madrasa_id: mine.madrasaId,
      label,
      start_date: startDate,
      end_date: endDate,
      is_current: true,
    })
    .select("id")
    .single();
  if (insertError || !year) {
    if ((insertError as { code?: string } | null)?.code === "23505")
      return { error: t(lang, "settings.year.err.label_exists") };
    return { error: t(lang, "settings.year.err.failed") };
  }

  // پرانا ڈیٹا: ہر فعال طالبہ کے لیے اس سال میں اس کی موجودہ جماعت
  const { data: students } = await supabase
    .from("students")
    .select("id, class_name, department, section")
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active");
  const rows = (students ?? []).map((s) => ({
    madrasa_id: mine.madrasaId,
    student_id: s.id as string,
    academic_year_id: year.id as string,
    class_name: (s.class_name as string | null) ?? null,
    department: s.department as string,
    section: s.section as string,
  }));
  if (rows.length > 0) {
    const { error: backfillError } = await supabase
      .from("enrollments")
      .upsert(rows, { onConflict: "student_id,academic_year_id" });
    if (backfillError)
      return { error: t(lang, "settings.year.err.failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "academic_year_created", {
    year_id: year.id as string,
    label,
    count: String(rows.length),
  });

  revalidatePath("/departments/settings");
  return { ok: true, count: rows.length };
}

/**
 * پرانا تعلیمی سال بنائیں — صرف مالک یا ایڈمن۔
 * موجودہ سال سے فرق: یہ سال موجودہ نہیں بنتا (is_current = false) اور
 * موجودہ سال پہلے سے ہو تب بھی بن جاتا ہے — اس لیے اس پر err.exists
 * والی شرط نہیں لگتی۔ پرانے ریکارڈ کے لیے ہے؛ اس میں کوئی طالبہ خود
 * نہیں ڈالی جاتی — ہر طالبہ طالبہ کی تفصیل والے فارم سے ڈالی جاتی ہے۔
 * ختم کی تاریخ وہی اصول: شروع سے 353 دن بعد (رمضان کا آخر)۔
 */
export async function createPastAcademicYear(
  formData: FormData,
): Promise<YearResult> {
  const lang = formLang(formData);
  const label = clean(formData.get("label"), 20);
  const startDate = clean(formData.get("start_date"), 10);
  if (!label) return { error: t(lang, "settings.year.err.label") };
  if (!validDate(startDate))
    return { error: t(lang, "settings.year.err.date") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  const owner = await isMadrasaOwner(supabase);
  const admin = await isAppAdmin(supabase);
  if (!owner && !admin) return { error: t(lang, "common.not_allowed") };

  // ختم کی تاریخ: رمضان کا آخر — شروع سے 353 دن بعد
  const end = new Date(`${startDate}T00:00:00`);
  end.setDate(end.getDate() + 353);
  const endDate = end.toISOString().slice(0, 10);

  const { data: year, error: insertError } = await supabase
    .from("academic_years")
    .insert({
      madrasa_id: mine.madrasaId,
      label,
      start_date: startDate,
      end_date: endDate,
      is_current: false,
    })
    .select("id")
    .single();
  if (insertError || !year) {
    if ((insertError as { code?: string } | null)?.code === "23505")
      return { error: t(lang, "settings.year.err.label_exists") };
    return { error: t(lang, "settings.year.err.failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "academic_year_past_created", {
    year_id: year.id as string,
    label,
  });

  revalidatePath("/departments/settings");
  return { ok: true, count: 0 };
}

/**
 * تعلیمی سال درست کریں — صرف مالک یا ایڈمن۔
 * نام + شروع کی تاریخ + ختم کی تاریخ بدلتی ہے؛ "موجودہ" ہونا، اندراج
 * اور امتحان نہیں بدلتے (سب سال کی پہچان/id سے جڑے ہیں)۔ سال مٹتا نہیں۔
 * جانچ: نام خالی نہیں، شروع < ختم، دوسرے سال سے ٹکراؤ نہیں۔
 */
export async function updateAcademicYear(
  formData: FormData,
): Promise<YearResult> {
  const lang = formLang(formData);
  const yearId = clean(formData.get("year_id"), 40);
  const label = clean(formData.get("label"), 20);
  const startDate = clean(formData.get("start_date"), 10);
  const endDate = clean(formData.get("end_date"), 10);
  if (!label) return { error: t(lang, "settings.year.err.label") };
  if (!validDate(startDate) || !validDate(endDate))
    return { error: t(lang, "settings.year.err.date") };
  if (startDate >= endDate)
    return { error: t(lang, "settings.year.err.range") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  const owner = await isMadrasaOwner(supabase);
  const admin = await isAppAdmin(supabase);
  if (!owner && !admin) return { error: t(lang, "common.not_allowed") };

  // سال میرا ہونا چاہیے
  const { data: year } = await supabase
    .from("academic_years")
    .select("id")
    .eq("id", yearId)
    .eq("madrasa_id", mine.madrasaId)
    .single();
  if (!year) return { error: t(lang, "settings.year.err.failed") };

  // دوسرے سال سے ٹکراؤ نہیں
  const { data: others } = await supabase
    .from("academic_years")
    .select("id, start_date, end_date")
    .eq("madrasa_id", mine.madrasaId)
    .neq("id", yearId);
  const clash = (others ?? []).some((o) =>
    yearRangesOverlap(
      { start_date: startDate, end_date: endDate },
      {
        start_date: o.start_date as string,
        end_date: o.end_date as string,
      },
    ),
  );
  if (clash) return { error: t(lang, "settings.year.err.overlap") };

  const { error } = await supabase
    .from("academic_years")
    .update({ label, start_date: startDate, end_date: endDate })
    .eq("id", yearId)
    .eq("madrasa_id", mine.madrasaId);
  if (error) {
    if ((error as { code?: string } | null)?.code === "23505")
      return { error: t(lang, "settings.year.err.label_exists") };
    return { error: t(lang, "settings.year.err.failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "academic_year_edited", {
    year_id: yearId,
    label,
  });

  revalidatePath("/departments/settings");
  return { ok: true, count: 0 };
}
