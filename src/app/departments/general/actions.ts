/**
 * مرحلہ 24 + مرحلہ 25 — مدرسے کا عمومی ریکارڈ بدلنے کا Server Action
 * ہر صارف صرف اپنے مدرسے کی معلومات بدل سکتا ہے — RLS پالیسیاں (اپنے
 * مدرسے کی UPDATE) یہ یقین دلاتی ہیں۔ نام `madrasas` میز میں بدلا جاتا
 * ہے، باقی معلومات `madrasa_profile` میں۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMadrasaOwner } from "@/lib/approval";
import { isModuleAllowedForMe } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import { isLang, t, type Lang } from "@/i18n/dictionary";

type ActionResult = { ok: true } | { error: string };

/** مرحلہ 123 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

function clean(value: FormDataEntryValue | null, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateMadrasaProfile(
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const name = clean(formData.get("name"), 200);
  const address = clean(formData.get("address"), 300);
  const phone = clean(formData.get("phone"), 20);
  const whatsapp = clean(formData.get("whatsapp"), 20);
  const email = clean(formData.get("email"), 200);
  const mohtamimName = clean(formData.get("mohtamim_name"), 200);
  const establishedYearRaw = clean(formData.get("established_year"), 4);
  const registrationNo = clean(formData.get("registration_no"), 100);
  const note = clean(formData.get("note"), 500);
  const hijriOffsetRaw = clean(formData.get("hijri_offset"), 3);
  const hijriOffset =
    hijriOffsetRaw === "-1" || hijriOffsetRaw === "1"
      ? Number(hijriOffsetRaw)
      : 0;

  if (!name) return { error: t(lang, "general.err.name_required") };
  if (phone && !PHONE_RE.test(phone))
    return { error: t(lang, "general.err.phone_invalid") };
  if (whatsapp && !PHONE_RE.test(whatsapp))
    return { error: t(lang, "general.err.whatsapp_invalid") };
  if (email && !EMAIL_RE.test(email))
    return { error: t(lang, "general.err.email_invalid") };
  let establishedYear: number | null = null;
  if (establishedYearRaw) {
    const y = Number(establishedYearRaw);
    if (!Number.isInteger(y) || y < 1900 || y > 2100)
      return { error: t(lang, "general.err.year_invalid") };
    establishedYear = y;
  }

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  // حصہ 4 کی درستگی — عمومی ریکارڈ بدلنا صرف مالک کا کام ہے (سپر ایڈمن ہونا ضروری نہیں)
  if (!(await isMadrasaOwner(supabase))) {
    return { error: t(lang, "general.err.owner_only") };
  }
  if (!(await isModuleAllowedForMe(supabase, "general"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // 1) نام — madrasas میز میں (صرف اپنا مدرسہ — RLS پالیسی)
  const { error: nameError } = await supabase
    .from("madrasas")
    .update({ name })
    .eq("id", mine.madrasaId);
  if (nameError)
    return { error: t(lang, "general.err.name_save_failed") };

  // 2) باقی معلومات — madrasa_profile میں (نہ ہو تو نیا ریکارڈ)
  const profileData = {
    madrasa_id: mine.madrasaId,
    address: address || null,
    phone: phone || null,
    whatsapp: whatsapp || null,
    email: email || null,
    mohtamim_name: mohtamimName || null,
    established_year: establishedYear,
    registration_no: registrationNo || null,
    note: note || null,
    hijri_offset: hijriOffset,
    updated_at: new Date().toISOString(),
  };
  const { error: profileError } = await supabase
    .from("madrasa_profile")
    .upsert(profileData, { onConflict: "madrasa_id" });
  if (profileError) {
    return { error: t(lang, "general.err.save_failed") };
  }

  try {
    await supabase.from("audit_log").insert({
      madrasa_id: mine.madrasaId,
      user_id: mine.userId,
      action: "madrasa_profile_updated",
      details: { name },
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }

  revalidatePath("/departments/general");
  revalidatePath("/");
  return { ok: true };
}
