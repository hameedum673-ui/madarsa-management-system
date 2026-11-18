/**
 * مرحلہ 86 — اپنی پروفائل بدلنا (نام + واٹس ایپ نمبر)
 * صرف اپنے ریکارڈ کے یہ دو خانے — عہدہ/مدرسہ/Gmail کبھی نہیں بدلتے
 * (یہ پابندی update_my_profile فنکشن کے اندر ہے)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import { isSelectableLang, t, type Lang } from "@/i18n/dictionary";

/** فارم سے زبان پڑھیں (نہ ہو یا غلط ہو تو اردو) — غلطیاں اسی زبان میں */
function langFromForm(formData: FormData, field = "lang"): Lang {
  const v = String(formData.get(field) ?? "");
  return isSelectableLang(v) ? v : "ur";
}

/** براہِ راست دی گئی زبان (نہ ہو یا غلط ہو تو اردو) */
function langFromValue(value: string | undefined): Lang {
  return value && isSelectableLang(value) ? value : "ur";
}

export type ProfileResult = { ok: true } | { error: string };

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

export async function updateMyProfile(
  formData: FormData,
): Promise<ProfileResult> {
  const formLang = langFromForm(formData);
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  if (!name) return { error: t(formLang, "profile.err_name") };
  if (name.length > 100)
    return { error: t(formLang, "profile.err_name_long") };
  if (whatsapp.length > 30)
    return { error: t(formLang, "profile.err_wa_long") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(formLang, "profile.err_login") };

  const { error } = await supabase.rpc("update_my_profile", {
    p_name: name,
    p_whatsapp: whatsapp,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: t(formLang, "profile.err_sql86") };
    }
    return { error: error.message || t(formLang, "profile.err_save") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "profile_updated", {
    name,
  });
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

/**
 * مرحلہ 102 — اپنی زبان بدلنا (اردو / عربی)
 * انگریزی اس مرحلے میں بند ہے — چنی جائے تو اردو غلطی ملتی ہے۔
 * پروفائل میں محفوظ ہوتی ہے (set_my_language RPC — migration 054) اور
 * "lang" کوکی بھی لگ جاتی ہے تاکہ اگلا صفحہ فوراً نئی زبان میں کھلے۔
 */
export async function setLanguage(
  formData: FormData,
): Promise<ProfileResult> {
  // غلطی موجودہ زبان میں دکھے — نئی زبان میں نہیں
  const currentLang = langFromForm(formData, "current_lang");
  const lang = String(formData.get("language") ?? "").trim();
  if (lang !== "ur" && lang !== "ar")
    return { error: t(currentLang, "profile.err_en") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(currentLang, "profile.err_login") };

  const { error } = await supabase.rpc("set_my_language", {
    p_language: lang,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: t(currentLang, "profile.err_sql102") };
    }
    return {
      error: error.message || t(currentLang, "profile.language_error"),
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  await writeAudit(supabase, mine.madrasaId, mine.userId, "language_changed", {
    language: lang,
  });
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

/**
 * مرحلہ 98 — مدرسے کا لوگو لگانا
 * صرف مالک (جیسے عمومی ریکارڈ) — فائل ایک ہی راستے پر جاتی ہے
 * (<madrasaId>/logo)، دوبارہ لگانے سے پرانی کی جگہ نئی آ جاتی ہے۔
 * لوگو کا پتہ madrasa_profile.logo_url میں محفوظ ہوتا ہے۔
 */
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadMadrasaLogo(
  formData: FormData,
): Promise<ProfileResult> {
  const formLang = langFromForm(formData);
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0)
    return { error: t(formLang, "profile.logo_err_nofile") };
  if (!LOGO_TYPES.includes(file.type))
    return { error: t(formLang, "profile.logo_err_type") };
  if (file.size > LOGO_MAX_BYTES)
    return { error: t(formLang, "profile.logo_err_size") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(formLang, "profile.err_login") };
  if (!(await isMadrasaOwner(supabase)))
    return { error: t(formLang, "profile.logo_owner") };

  const path = `${mine.madrasaId}/logo`;
  const { error: uploadError } = await supabase.storage
    .from("madrasa-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    if (uploadError.message.includes("Bucket not found"))
      return { error: t(formLang, "profile.err_sql98") };
    return { error: t(formLang, "profile.logo_err_upload") };
  }

  // ?v= وقت کے ساتھ — تاکہ نیا لوگو لگتے ہی تازہ تصویر دکھے، پرانی
  // محفوظ شدہ (cache) تصویر نہیں
  const { data: pub } = supabase.storage
    .from("madrasa-logos")
    .getPublicUrl(path);
  const logoUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase
    .from("madrasa_profile")
    .upsert(
      {
        madrasa_id: mine.madrasaId,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "madrasa_id" },
    );
  if (profileError) {
    // ریکارڈ نہ بنا تو اپلوڈ کی ہوئی فائل بھی ہٹا دیں تاکہ کچرا نہ رہے
    await supabase.storage.from("madrasa-logos").remove([path]);
    if (profileError.code === "PGRST204")
      return { error: t(formLang, "profile.err_sql98") };
    return { error: t(formLang, "profile.logo_err_save") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "madrasa_logo_updated", {
    logo_url: logoUrl,
  });
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

/** مرحلہ 98 — مدرسے کا لوگو ہٹانا (صرف مالک) */
export async function removeMadrasaLogo(
  lang?: string,
): Promise<ProfileResult> {
  const formLang = langFromValue(lang);
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(formLang, "profile.err_login") };
  if (!(await isMadrasaOwner(supabase)))
    return { error: t(formLang, "profile.logo_owner") };

  await supabase.storage
    .from("madrasa-logos")
    .remove([`${mine.madrasaId}/logo`]);
  const { error } = await supabase
    .from("madrasa_profile")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("madrasa_id", mine.madrasaId);
  if (error) return { error: t(formLang, "profile.logo_err_remove") };

  await writeAudit(supabase, mine.madrasaId, mine.userId, "madrasa_logo_removed", {});
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
