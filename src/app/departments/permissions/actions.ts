/**
 * مرحلہ 26 — اجازتیں محفوظ کرنے کا Server Action (صرف ایڈمن)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * ایڈمن اپنی اجازتیں نہیں بدل سکتا — وہ ہمیشہ اجازت شدہ ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";
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
  const admin = await isAppAdmin(supabase);
  if (!admin) return { error: "صرف ایڈمن یہ کام کر سکتا ہے۔" };
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
