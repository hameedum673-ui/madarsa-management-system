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
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

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
