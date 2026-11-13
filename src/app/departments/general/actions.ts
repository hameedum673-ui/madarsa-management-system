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
import { isModuleAllowedForMe, MODULE_DENIED_ERROR } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const PHONE_RE = /^[0-9+\-()\s]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateMadrasaProfile(
  formData: FormData,
): Promise<ActionResult> {
  const name = clean(formData.get("name"), 200);
  const address = clean(formData.get("address"), 300);
  const phone = clean(formData.get("phone"), 20);
  const whatsapp = clean(formData.get("whatsapp"), 20);
  const email = clean(formData.get("email"), 200);
  const mohtamimName = clean(formData.get("mohtamim_name"), 200);
  const establishedYearRaw = clean(formData.get("established_year"), 4);
  const registrationNo = clean(formData.get("registration_no"), 100);
  const note = clean(formData.get("note"), 500);

  if (!name) return { error: "مدرسے کا نام لکھیں۔" };
  if (phone && !PHONE_RE.test(phone))
    return { error: "فون نمبر درست شکل میں لکھیں۔" };
  if (whatsapp && !PHONE_RE.test(whatsapp))
    return { error: "واٹس ایپ نمبر درست شکل میں لکھیں۔" };
  if (email && !EMAIL_RE.test(email))
    return { error: "ای میل درست شکل میں لکھیں۔" };
  let establishedYear: number | null = null;
  if (establishedYearRaw) {
    const y = Number(establishedYearRaw);
    if (!Number.isInteger(y) || y < 1900 || y > 2100)
      return { error: "قیام کا سال 1900 سے 2100 کے درمیان ہونا چاہیے۔" };
    establishedYear = y;
  }

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  // حصہ 4 کی درستگی — عمومی ریکارڈ بدلنا صرف مالک کا کام ہے (سپر ایڈمن ہونا ضروری نہیں)
  if (!(await isMadrasaOwner(supabase))) {
    return { error: "صرف مدرسے کا مالک عمومی ریکارڈ بدل سکتا ہے۔" };
  }
  if (!(await isModuleAllowedForMe(supabase, "general"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // 1) نام — madrasas میز میں (صرف اپنا مدرسہ — RLS پالیسی)
  const { error: nameError } = await supabase
    .from("madrasas")
    .update({ name })
    .eq("id", mine.madrasaId);
  if (nameError) return { error: "نام محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };

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
    updated_at: new Date().toISOString(),
  };
  const { error: profileError } = await supabase
    .from("madrasa_profile")
    .upsert(profileData, { onConflict: "madrasa_id" });
  if (profileError) {
    return { error: "معلومات محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔" };
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
