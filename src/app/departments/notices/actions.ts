/**
 * مرحلہ 27 — اطلاعات اور اعلانات کے Server Actions (اضافہ / تبدیلی / محفوظ)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * اطلاع کبھی حذف نہیں ہوتی — پرانی اطلاع محفوظ (archive) کی جاتی ہے۔
 * تاریخ مستقبل کی بھی ہو سکتی ہے (تعطیل کی اطلاع پہلے سے دی جاتی ہے)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import {
  NOTICE_KINDS,
  type NoticeKind,
  type NoticeStatus,
} from "@/lib/notices";
import { isLang, t, type Lang } from "@/i18n/dictionary";

type ActionResult = { ok: true } | { error: string };

/** مرحلہ 125 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

interface NoticeFields {
  title: string;
  body: string;
  kind: NoticeKind;
  noticeDate: string;
}

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: NoticeFields } | { error: string } {
  const lang = formLang(formData);
  const title = clean(formData.get("title"), 200);
  const body = clean(formData.get("body"), 2000);
  const kind = clean(formData.get("kind"), 20);
  const noticeDate = clean(formData.get("notice_date"), 10);

  if (!title) return { error: t(lang, "notice.err.title_required") };
  if (!NOTICE_KINDS.includes(kind as NoticeKind))
    return { error: t(lang, "notice.err.kind_invalid") };
  if (!validDate(noticeDate)) return { error: t(lang, "notice.err.date_invalid") };

  return {
    fields: {
      title,
      body,
      kind: kind as NoticeKind,
      noticeDate,
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

/** نئی اطلاع شامل کریں */
export async function addNotice(formData: FormData): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "notices"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("notices")
    .insert({
      madrasa_id: mine.madrasaId,
      title: f.title,
      body: f.body || null,
      kind: f.kind,
      notice_date: f.noticeDate,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "notice.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "notice_created", {
    notice_id: data.id as string,
    title: f.title,
  });

  revalidatePath("/departments/notices");
  revalidatePath("/");
  return { ok: true };
}

/** اطلاع تبدیل کریں — مدرسہ کبھی نہیں بدلتا */
export async function updateNotice(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "archived")
    return { error: t(lang, "notice.err.status_invalid") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "notices"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // RLS خود یقین دلاتی ہے کہ یہ اطلاع اسی مدرسے کی ہے
  const { data, error } = await supabase
    .from("notices")
    .update({
      title: f.title,
      body: f.body || null,
      kind: f.kind,
      notice_date: f.noticeDate,
      status: status as NoticeStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "notice.err.update_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "notice_updated", {
    notice_id: data.id as string,
    title: f.title,
  });

  revalidatePath("/departments/notices");
  revalidatePath(`/departments/notices/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** اطلاع محفوظ کریں (archive) — حذف نہیں ہوتی، ریکارڈ رہتا ہے */
export async function archiveNotice(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "notices"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("notices")
    .update({
      status: "archived" as NoticeStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, title")
    .single();

  if (error || !data) {
    return { error: t(lang, "notice.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "notice_archived", {
    notice_id: data.id as string,
    title: (data as { title: string }).title,
  });

  revalidatePath("/departments/notices");
  revalidatePath(`/departments/notices/${id}`);
  revalidatePath("/");
  return { ok: true };
}
