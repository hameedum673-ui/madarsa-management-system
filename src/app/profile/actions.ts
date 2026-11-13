/**
 * مرحلہ 86 — اپنی پروفائل بدلنا (نام + واٹس ایپ نمبر)
 * صرف اپنے ریکارڈ کے یہ دو خانے — عہدہ/مدرسہ/Gmail کبھی نہیں بدلتے
 * (یہ پابندی update_my_profile فنکشن کے اندر ہے)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
