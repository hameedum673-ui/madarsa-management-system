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
  const name = String(formData.get("name") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  if (!name) return { error: "نام لکھیں۔" };
  if (name.length > 100) return { error: "نام بہت لمبا ہے۔" };
  if (whatsapp.length > 30) return { error: "واٹس ایپ نمبر بہت لمبا ہے۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  const { error } = await supabase.rpc("update_my_profile", {
    p_name: name,
    p_whatsapp: whatsapp,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: "پہلے مرحلہ 86 کی SQL چلائیں۔" };
    }
    return { error: error.message || "پروفائل محفوظ نہیں ہو سکی۔" };
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
  const lang = String(formData.get("language") ?? "").trim();
  if (lang !== "ur" && lang !== "ar")
    return { error: "انگریزی جلد آ رہا ہے۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  const { error } = await supabase.rpc("set_my_language", {
    p_language: lang,
  });
  if (error) {
    if (error.code === "PGRST202" || error.code === "42883") {
      return { error: "پہلے مرحلہ 102 کی SQL چلائیں۔" };
    }
    return { error: error.message || "زبان محفوظ نہیں ہو سکی۔" };
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
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0)
    return { error: "پہلے تصویر چنیں۔" };
  if (!LOGO_TYPES.includes(file.type))
    return { error: "صرف JPG، PNG یا WebP تصویر چلے گی۔" };
  if (file.size > LOGO_MAX_BYTES)
    return { error: "تصویر 2MB سے بڑی ہے — چھوٹی تصویر چنیں۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isMadrasaOwner(supabase)))
    return { error: "صرف مدرسے کا مالک لوگو بدل سکتا ہے۔" };

  const path = `${mine.madrasaId}/logo`;
  const { error: uploadError } = await supabase.storage
    .from("madrasa-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) {
    if (uploadError.message.includes("Bucket not found"))
      return { error: "پہلے مرحلہ 98 کی SQL چلائیں۔" };
    return { error: "لوگو اپلوڈ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
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
      return { error: "پہلے مرحلہ 98 کی SQL چلائیں۔" };
    return { error: "لوگو محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "madrasa_logo_updated", {
    logo_url: logoUrl,
  });
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}

/** مرحلہ 98 — مدرسے کا لوگو ہٹانا (صرف مالک) */
export async function removeMadrasaLogo(): Promise<ProfileResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isMadrasaOwner(supabase)))
    return { error: "صرف مدرسے کا مالک لوگو بدل سکتا ہے۔" };

  await supabase.storage
    .from("madrasa-logos")
    .remove([`${mine.madrasaId}/logo`]);
  const { error } = await supabase
    .from("madrasa_profile")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("madrasa_id", mine.madrasaId);
  if (error) return { error: "لوگو ہٹایا نہیں جا سکا۔ دوبارہ کوشش کریں۔" };

  await writeAudit(supabase, mine.madrasaId, mine.userId, "madrasa_logo_removed", {});
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
