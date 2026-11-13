/**
 * مرحلہ 11 — منظوری کا نظام: قسمیں، واٹس ایپ اور سرور مددگار
 * منظوری کی جانچ سرور پر ہوتی ہے (middleware + محفوظ SQL فنکشن) —
 * فرنٹ اینڈ پر بٹن چھپانا سکیورٹی نہیں ہے۔
 */
import type { createClient } from "@/lib/supabase/server";
import type { MadrasaRole } from "@/lib/tenancy";

/** ایڈمن کا واٹس ایپ — "واٹس ایپ پر رابطہ کریں" بٹن اسی پر کھلتا ہے */
export const WHATSAPP_URL = "https://wa.me/923373248940";
export const WHATSAPP_NUMBER_DISPLAY = "0337 3248940";

export type ApprovalStatus = "pending" | "approved" | "disabled";

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "زیرِ منظوری",
  approved: "منظور شدہ",
  disabled: "غیر فعال",
};

export const APPROVAL_STATUS_IDS: ApprovalStatus[] = [
  "pending",
  "approved",
  "disabled",
];

/** ایڈمن جن کرداروں میں کسی صارف کو منظور کر سکتا ہے (super_admin نہیں) */
export const ASSIGNABLE_ROLES: MadrasaRole[] = [
  "mohtamim",
  "nazim_taleemat",
  "muhasib",
  "mudarris",
  "clerk",
];

export const ROLE_LABELS: Record<MadrasaRole, string> = {
  super_admin: "سپر ایڈمن",
  mohtamim: "مہتمم",
  nazim_taleemat: "ناظم تعلیمات",
  muhasib: "محاسب",
  mudarris: "مدرس",
  clerk: "کلرک",
};

export interface ApprovedUser {
  id: string;
  email: string;
  name: string;
  whatsapp: string | null;
  status: ApprovalStatus;
  assigned_role: MadrasaRole | null;
  assigned_madrasa_id: string | null;
  designation: string | null;
  member_type: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** کیا موجودہ صارف پہلا ایڈمن ہے؟ (سب سے پرانی super_admin پروفائل)
 * — مرحلہ 81: میز نہ بنی ہو تو false (محفوظ) */
export async function isPrimaryAdmin(
  supabase: ServerClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("am_i_primary_admin");
  if (error) return false;
  return data === true;
}

/** کیا موجودہ صارف نظام کا ایڈمن ہے؟ (حصہ 2)
 * — نظام کا ایڈمن وہ ہے جو system_admins میں درج ہے (حمید صاحب کے کھاتے)؛
 * مدرسے کا مالک super_admin ہو کر بھی نظام کا ایڈمن نہیں ہوتا۔
 * میز/فنکشن نہ بنی ہو تو false (محفوظ) */
export async function isSystemAdmin(
  supabase: ServerClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("am_i_system_admin");
  if (error) return false;
  return data === true;
}

/** کیا موجودہ صارف اپنے مدرسے کا مالک ہے؟ (حصہ 4 کی درستگی)
 * — مالک وہ ہے جس کی approved_users قطار منظور شدہ ہے اور member_type
 * 'owner' ہے۔ سپر ایڈمن ہونا ضروری نہیں — نیا مدرسہ مہتمم/ناظم کے کھاتے
 * سے بھی چلتا ہے۔ عملہ (member_type 'staff') کبھی مالک نہیں ہوتا۔
 * میز/فنکشن نہ بنی ہو تو false (محفوظ) */
export async function isMadrasaOwner(
  supabase: ServerClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("am_i_madrasa_owner");
  if (error) return false;
  return data === true;
}

/** کیا موجودہ صارف ایڈمن (super_admin) ہے؟ — سرور پر جانچ */
export async function isAppAdmin(supabase: ServerClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return (data as { role?: string } | null)?.role === "super_admin";
}
