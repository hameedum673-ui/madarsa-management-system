/**
 * مرحلہ 26 — اجازتیں محفوظ کرنے کا Server Action
 * (صرف نظام کا ایڈمن — حصہ 2؛ یہ عالمی صفحہ ہے، کسی بھی ای میل کی
 * اجازتیں بدل سکتا ہے، اس لیے مالک یہاں نہیں آ سکتا — عملے کی اجازتیں
 * حصہ 3 والے صفحے سے مقرر ہوں گی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * ایڈمن اپنی اجازتیں نہیں بدل سکتا — وہ ہمیشہ اجازت شدہ ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isSystemAdmin } from "@/lib/approval";
import { SECTION_IDS } from "@/lib/students";
import { PERMISSION_MODULE_IDS } from "@/lib/permissions";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** صارف کی اجازتیں محفوظ کریں — ٹک لگا ہو تو اجازت، نہ ہو تو بند */
export async function savePermissions(
  formData: FormData,
): Promise<ActionResult> {
  const userEmail = clean(formData.get("user_email"), 200).toLowerCase();
  if (!userEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail))
    return { error: "صارف کا Gmail درست نہیں ہے۔" };

  const supabase = await createClient();
  const admin = await isSystemAdmin(supabase);
  if (!admin) return { error: "صرف نظام کا ایڈمن یہ کام کر سکتا ہے۔" };
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // ایڈمن اپنی اجازتیں نہیں بدل سکتا
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email?.toLowerCase() === userEmail)
    return { error: "ایڈمن اپنی اجازتیں نہیں بدل سکتا۔" };

  // صارف منظور شدہ ہونا چاہیے
  const { data: approved } = await supabase
    .from("approved_users")
    .select("id")
    .eq("email", userEmail)
    .eq("status", "approved")
    .single();
  if (!approved) return { error: "یہ صارف منظور شدہ نہیں ہے۔" };

  // ہر شعبے کی اجازت — ٹک لگا ہو تو true، نہ ہو تو false
  const rows = PERMISSION_MODULE_IDS.map((module) => ({
    user_email: userEmail,
    module,
    allowed: formData.get(`mod_${module}`) === "on",
    updated_by: mine.userId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("user_permissions")
    .upsert(rows, { onConflict: "user_email,module" });
  if (error) {
    return { error: "اجازتیں محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔" };
  }

  // مرحلہ 53 — شعبے کی اجازت (بنین / بنات) — ٹک لگا ہو تو اجازت، نہ ہو تو بند
  const sectionRows = SECTION_IDS.map((section) => ({
    user_email: userEmail,
    section,
    allowed: formData.get(`sec_${section}`) === "on",
    updated_by: mine.userId,
    updated_at: new Date().toISOString(),
  }));

  const { error: sectionError } = await supabase
    .from("user_sections")
    .upsert(sectionRows, { onConflict: "user_email,section" });
  if (sectionError) {
    // میز ابھی نہ بنی ہو تو شعبوں کی اجازتیں محفوظ ہو چکی ہوتی ہیں —
    // SQL چلا کر دوبارہ محفوظ کریں
    if ((sectionError as { code?: string }).code === "42P01")
      return {
        error:
          "شعبے کی اجازتیں محفوظ نہیں ہو سکیں — پہلے مرحلہ 53 کی SQL چلائیں۔ شعبوں کی اجازتیں محفوظ ہو چکی ہیں، SQL چلا کر دوبارہ محفوظ کریں۔",
      };
    return { error: "شعبے کی اجازتیں محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔" };
  }

  try {
    await supabase.from("audit_log").insert({
      madrasa_id: mine.madrasaId,
      user_id: mine.userId,
      action: "permissions_updated",
      details: { user_email: userEmail },
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }

  revalidatePath("/departments/permissions");
  revalidatePath("/");
  return { ok: true };
}
