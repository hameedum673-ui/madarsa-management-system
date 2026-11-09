/**
 * مرحلہ 11 — صارفین کی منظوری کے Server Actions (صرف ایڈمن)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * ایڈمن کے علاوہ کوئی دوسرا شخص خود کو ایڈمن نہیں بنا سکتا — کرداروں کی
 * فہرست میں super_admin شامل ہی نہیں ہے۔
 * منظوری کے وقت کردار اور مدرسہ طے ہوتا ہے؛ صارف کا profile اگلے لاگ اِن پر
 * خود بن جاتا ہے (ensure_my_profile فنکشن)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNABLE_ROLES,
  isAppAdmin,
  type ApprovalStatus,
} from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import type { MadrasaRole } from "@/lib/tenancy";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

/** ایڈمن کی جانچ — صرف super_admin یہ کام کر سکتا ہے */
type AdminContext =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      madrasaId: string;
      userId: string;
    };

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);
  if (!admin) return { error: "صرف ایڈمن یہ کام کر سکتا ہے۔" };
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "ایڈمن کا مدرسہ نہیں ملا۔" };
  return { supabase, ...mine };
}

/** صارف کو منظور کریں — کردار چننا ضروری ہے */
export async function approveUser(formData: FormData): Promise<ActionResult> {
  const id = clean(formData.get("id"), 100);
  const role = clean(formData.get("role"), 30);
  if (!id) return { error: "صارف نہیں ملا۔" };
  if (!(ASSIGNABLE_ROLES as string[]).includes(role))
    return { error: "کردار درست منتخب کریں۔" };

  const checked = await requireAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { data, error } = await supabase
    .from("approved_users")
    .update({
      status: "approved",
      assigned_role: role as MadrasaRole,
      assigned_madrasa_id: madrasaId,
      approved_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, email, name")
    .single();

  if (error || !data) {
    return { error: "منظوری نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, madrasaId, userId, "user_approved", {
    approved_user_id: data.id as string,
    email: data.email as string,
    role,
  });

  revalidatePath("/departments/users");
  return { ok: true };
}

/** صارف کی حالت بدلیں — غیر فعال یا دوبارہ فعال */
export async function setUserStatus(formData: FormData): Promise<ActionResult> {
  const id = clean(formData.get("id"), 100);
  const status = clean(formData.get("status"), 20);
  if (!id) return { error: "صارف نہیں ملا۔" };
  if (status !== "approved" && status !== "disabled")
    return { error: "حالت درست منتخب کریں۔" };

  const checked = await requireAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { data, error } = await supabase
    .from("approved_users")
    .update({
      status: status as ApprovalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, email, name")
    .single();

  if (error || !data) {
    return { error: "حالت نہیں بدلی جا سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    madrasaId,
    userId,
    status === "approved" ? "user_reactivated" : "user_disabled",
    {
      approved_user_id: data.id as string,
      email: data.email as string,
    },
  );

  revalidatePath("/departments/users");
  return { ok: true };
}

/** ای میل سے نیا صارف شامل کریں — سیدھا منظور شدہ (ایڈمن خود شامل کر رہا ہے) */
export async function addApprovedUser(
  formData: FormData,
): Promise<ActionResult> {
  const email = clean(formData.get("email"), 200).toLowerCase();
  const name = clean(formData.get("name"), 100);
  const whatsapp = clean(formData.get("whatsapp"), 20);
  const role = clean(formData.get("role"), 30);
  if (!validEmail(email)) return { error: "Gmail درست لکھیں۔" };
  if (!name) return { error: "صارف کا نام ضروری ہے۔" };
  if (!(ASSIGNABLE_ROLES as string[]).includes(role))
    return { error: "کردار درست منتخب کریں۔" };

  const checked = await requireAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { data, error } = await supabase
    .from("approved_users")
    .insert({
      email,
      name,
      whatsapp: whatsapp || null,
      status: "approved",
      assigned_role: role as MadrasaRole,
      assigned_madrasa_id: madrasaId,
      approved_by: userId,
    })
    .select("id, email")
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23505")
      return { error: "یہ Gmail پہلے سے درج ہے۔" };
    return { error: "صارف شامل نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, madrasaId, userId, "user_added", {
    approved_user_id: data.id as string,
    email: data.email as string,
    role,
  });

  revalidatePath("/departments/users");
  return { ok: true };
}
