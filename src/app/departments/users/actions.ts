/**
 * مرحلہ 11 — صارفین کی منظوری کے Server Actions (صرف نظام کا ایڈمن — حصہ 2)
 * یہ کارروائیاں عالمی ہیں (نئے مدرسے منظور کرنا، مہمان کی ترتیب) —
 * مدرسے کا مالک اپنے عملے کا انتظام الگ صفحے سے کرے گا (حصہ 3)۔
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * ایڈمن کے علاوہ کوئی دوسرا شخص خود کو ایڈمن نہیں بنا سکتا — کرداروں کی
 * فہرست میں super_admin شامل ہی نہیں ہے۔
 * منظوری کے وقت کردار اور مدرسہ طے ہوتا ہے؛ صارف کا profile اگلے لاگ اِن پر
 * خود بن جاتا ہے (ensure_my_profile فنکشن)۔
 */
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNABLE_ROLES,
  isSystemAdmin,
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

/** نظام کے ایڈمن کی جانچ — صرف نظام کا ایڈمن یہ کام کر سکتا ہے (حصہ 2) */
type AdminContext =
  | { error: string }
  | {
      supabase: Awaited<ReturnType<typeof createClient>>;
      madrasaId: string;
      userId: string;
    };

async function requireSystemAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const admin = await isSystemAdmin(supabase);
  if (!admin) return { error: "صرف نظام کا ایڈمن یہ کام کر سکتا ہے۔" };
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "ایڈمن کا مدرسہ نہیں ملا۔" };
  return { supabase, ...mine };
}

/** نئے صارف کا اپنا الگ مدرسہ بنائیں — مرحلہ 25 کی علیحدگی
 *  (ایڈمن کا مدرسہ کبھی استعمال نہیں ہوتا؛ نیا مدرسہ خالی ہوتا ہے)
 *  درستی (مرحلہ 25 فکس): id کوڈ میں بنایا جاتا ہے اور واپس مانگا نہیں
 *  جاتا — کیونکہ `madrasas` کی پڑھنے والی پالیسی صرف اپنا مدرسہ دکھاتی
 *  ہے، اس لیے نیا مدرسہ واپس مانگنے پر خالی جواب آتا تھا اور کوڈ سمجھتا
 *  تھا کہ مدرسہ بنا ہی نہیں (حالانکہ قطار بن جاتی تھی)۔ */
async function createWorkspace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  displayName: string,
): Promise<{ id: string } | { error: string }> {
  const base = displayName || "نیا صارف";
  const newId = randomUUID();
  const { error } = await supabase
    .from("madrasas")
    .insert({ id: newId, name: `${base} کا مدرسہ` });
  if (error) {
    return { error: "نیا مدرسہ نہیں بن سکا — پہلے مرحلہ 25 کی SQL چلائیں۔" };
  }
  return { id: newId };
}

/** صارف کو منظور کریں — کردار چننا ضروری ہے؛ اسے اپنا الگ مدرسہ ملتا ہے */
export async function approveUser(formData: FormData): Promise<ActionResult> {
  const id = clean(formData.get("id"), 100);
  const role = clean(formData.get("role"), 30);
  if (!id) return { error: "صارف نہیں ملا۔" };
  if (!(ASSIGNABLE_ROLES as string[]).includes(role))
    return { error: "کردار درست منتخب کریں۔" };

  const checked = await requireSystemAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  // پہلے صارف کا ریکارڈ نکالیں تاکہ اس کے نام سے الگ مدرسہ بن سکے
  const { data: existing } = await supabase
    .from("approved_users")
    .select("id, email, name")
    .eq("id", id)
    .single();
  if (!existing) return { error: "صارف نہیں ملا۔" };

  const workspace = await createWorkspace(
    supabase,
    (existing.name as string) ||
      (existing.email as string).split("@")[0],
  );
  if ("error" in workspace) return { error: workspace.error };

  const { data, error } = await supabase
    .from("approved_users")
    .update({
      status: "approved",
      assigned_role: role as MadrasaRole,
      assigned_madrasa_id: workspace.id,
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
    workspace_madrasa_id: workspace.id,
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

  const checked = await requireSystemAdmin();
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

/** صارف کا کردار بدلیں — ترقی یا تنزلی (مرحلہ 81)
 * ترقی کوئی بھی super_admin کر سکتا ہے؛ تنزلی کی جانچ RPC میں ہے
 * (صرف پہلا ایڈمن، اور پہلے ایڈمن کو کوئی نہیں ہٹا سکتا) */
export async function setUserRole(formData: FormData): Promise<ActionResult> {
  const id = clean(formData.get("id"), 100);
  const role = clean(formData.get("role"), 30);
  if (!id) return { error: "صارف نہیں ملا۔" };
  const ALL_ROLES: string[] = ["super_admin", ...ASSIGNABLE_ROLES];
  if (!ALL_ROLES.includes(role))
    return { error: "کردار درست منتخب کریں۔" };

  const checked = await requireSystemAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { data: target } = await supabase
    .from("approved_users")
    .select("id, email, name, assigned_role")
    .eq("id", id)
    .single();
  if (!target) return { error: "صارف نہیں ملا۔" };

  const { data, error } = await supabase.rpc("set_user_role", {
    p_approved_user_id: id,
    p_role: role,
  });
  if (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "PGRST202" || code === "42883")
      return { error: "میز نہیں بنی — پہلے مرحلہ 81 کی SQL چلائیں۔" };
    return { error: "کردار نہیں بدلا جا سکا۔ دوبارہ کوشش کریں۔" };
  }
  if (data !== true) {
    return { error: "کردار نہیں بدلا جا سکا۔" };
  }

  await writeAudit(
    supabase,
    madrasaId,
    userId,
    role === "super_admin" ? "user_promoted" : "user_demoted",
    {
      approved_user_id: target.id as string,
      email: target.email as string,
      role,
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

  const checked = await requireSystemAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  // نیا صارف شامل کرنے سے پہلے اس کا اپنا الگ مدرسہ بنائیں
  const workspace = await createWorkspace(supabase, name);
  if ("error" in workspace) return { error: workspace.error };

  const { data, error } = await supabase
    .from("approved_users")
    .insert({
      email,
      name,
      whatsapp: whatsapp || null,
      status: "approved",
      assigned_role: role as MadrasaRole,
      assigned_madrasa_id: workspace.id,
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
    workspace_madrasa_id: workspace.id,
  });

  revalidatePath("/departments/users");
  return { ok: true };
}

/** مہمان رسائی کی ترتیب بدلیں — سوئچ + گھنٹے (صرف ایڈمن) */
export async function saveGuestSettings(
  formData: FormData,
): Promise<ActionResult> {
  const allowGuests = formData.get("allow_guests") === "on";
  const hoursRaw = clean(formData.get("guest_hours"), 10);
  const hours = Number(hoursRaw);
  if (!Number.isInteger(hours) || hours < 1 || hours > 24)
    return { error: "گھنٹے 1 سے 24 کے درمیان لکھیں۔" };

  const checked = await requireSystemAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { error } = await supabase
    .from("guest_settings")
    .update({
      allow_guests: allowGuests,
      guest_hours: hours,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    if ((error as { code?: string } | null)?.code === "42P01")
      return { error: "میز نہیں بنی — پہلے مرحلہ 67 کی SQL چلائیں۔" };
    return { error: "ترتیب نہیں بدلی جا سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, madrasaId, userId, "guest_settings_updated", {
    allow_guests: allowGuests ? "on" : "off",
    guest_hours: String(hours),
  });
  revalidatePath("/departments/users");
  return { ok: true };
}

/** مہمان کی رسائی ابھی بند کریں — ختم ہونے کا وقت ابھی کر دیں (صرف ایڈمن) */
export async function closeGuest(formData: FormData): Promise<ActionResult> {
  const id = clean(formData.get("id"), 100);
  if (!id) return { error: "مہمان نہیں ملا۔" };

  const checked = await requireSystemAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { data, error } = await supabase
    .from("profiles")
    .update({ guest_expires_at: new Date().toISOString() })
    .eq("id", id)
    .not("guest_expires_at", "is", null)
    .select("id, name")
    .single();
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "42P01")
      return { error: "میز نہیں بنی — پہلے مرحلہ 67 کی SQL چلائیں۔" };
    return { error: "مہمان بند نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, madrasaId, userId, "guest_closed", {
    guest_id: data.id as string,
    guest_name: (data.name as string) ?? "",
  });
  revalidatePath("/departments/users");
  return { ok: true };
}

/** ختم شدہ مہمان کا ڈیٹا مٹائیں — مستقل ہے، واپسی نہیں (صرف ایڈمن) */
export async function deleteGuest(id: string): Promise<ActionResult> {
  if (!id || typeof id !== "string") return { error: "مہمان نہیں ملا۔" };

  const checked = await requireSystemAdmin();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const { data: guest } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("id", id.slice(0, 100))
    .not("guest_expires_at", "is", null)
    .single();
  if (!guest) return { error: "مہمان نہیں ملا۔" };

  const { data, error } = await supabase.rpc("delete_guest_data", {
    p_guest_id: id.slice(0, 100),
  });
  if (error) {
    return { error: "مہمان مٹایا نہیں جا سکا — پہلے مرحلہ 68 کی SQL چلائیں۔" };
  }
  if (data !== true) {
    return { error: "مہمان مٹایا نہیں جا سکا — پہلے اسے بند کریں۔" };
  }

  await writeAudit(supabase, madrasaId, userId, "guest_deleted", {
    guest_id: guest.id as string,
    guest_name: (guest.name as string) ?? "",
  });
  revalidatePath("/departments/users");
  return { ok: true };
}
