/**
 * حصہ 3 — عملے کا انتظام (صرف مدرسے کا مالک)
 * مالک اپنے مدرسے میں عملہ شامل کرتا ہے — نیا مدرسہ نہیں بنتا؛
 * عملہ مالک کے مدرسے سے جڑتا ہے اور صرف وہی شعبے دیکھتا ہے جو مالک کھولے۔
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * نوٹ: جس Gmail کا پہلے سے اپنا مدرسہ/منظوری ہے، اسے عملہ نہیں بنایا جا سکتا۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  ASSIGNABLE_ROLES,
  isMadrasaOwner,
  type ApprovalStatus,
} from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import type { MadrasaRole } from "@/lib/tenancy";
import { PERMISSION_MODULE_IDS } from "@/lib/permissions";
import { SECTION_IDS } from "@/lib/students";

type ActionResult = { ok: true } | { error: string };

type ServerClient = Awaited<ReturnType<typeof createClient>>;

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** آڈٹ لاگ میں اندراج — ناکام ہو تو اصل کام نہیں رکتا */
async function writeAudit(
  supabase: ServerClient,
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

/** مالک کی جانچ — صرف super_admin (مدرسے کا مالک) یہ کام کر سکتا ہے */
type OwnerContext =
  | { error: string }
  | {
      supabase: ServerClient;
      madrasaId: string;
      userId: string;
    };

async function requireOwner(): Promise<OwnerContext> {
  const supabase = await createClient();
  // حصہ 4 کی درستگی — مالک کی جانچ (سپر ایڈمن ہونا ضروری نہیں)
  const owner = await isMadrasaOwner(supabase);
  if (!owner) return { error: "صرف مدرسے کا مالک یہ کام کر سکتا ہے۔" };
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "مالک کا مدرسہ نہیں ملا۔" };
  return { supabase, ...mine };
}

/** ہدف میرے مدرسے کا عملہ ہو — ورنہ null */
async function getOwnStaffByEmail(
  supabase: ServerClient,
  email: string,
  madrasaId: string,
) {
  const { data } = await supabase
    .from("approved_users")
    .select("id, email, name, status")
    .eq("email", email)
    .eq("member_type", "staff")
    .eq("assigned_madrasa_id", madrasaId)
    .single();
  return (data as { id: string; email: string; name: string; status: string } | null) ?? null;
}

async function getOwnStaffById(
  supabase: ServerClient,
  id: string,
  madrasaId: string,
) {
  const { data } = await supabase
    .from("approved_users")
    .select("id, email, name, status")
    .eq("id", id)
    .eq("member_type", "staff")
    .eq("assigned_madrasa_id", madrasaId)
    .single();
  return (data as { id: string; email: string; name: string; status: string } | null) ?? null;
}

/**
 * عملے کی اجازتیں محفوظ کریں — ہر ماڈیول + ہر شعبے کی واضح قطار
 * (کوئی قطار نہ ہو تو اجازت سمجھی جاتی ہے، اس لیے سب کچھ واضح لکھنا ضروری ہے)
 * ترتیبات ہمیشہ کھلی (ذاتی کھاتہ)؛ بیک اپ اور عمومی ریکارڈ ہمیشہ بند (صرف مالک)۔
 */
async function saveStaffPermissionRows(
  supabase: ServerClient,
  email: string,
  userId: string,
  formData: FormData,
): Promise<string | null> {
  const rows = PERMISSION_MODULE_IDS.map((module) => ({
    user_email: email,
    module,
    allowed:
      module === "settings"
        ? true
        : module === "backup" || module === "general"
          ? false
          : formData.get(`mod_${module}`) === "on",
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("user_permissions")
    .upsert(rows, { onConflict: "user_email,module" });
  if (error) {
    if ((error as { code?: string } | null)?.code === "23514")
      return "اجازتیں محفوظ نہیں ہو سکیں — پہلے حصہ 3 کی SQL چلائیں۔";
    return "اجازتیں محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔";
  }

  const sectionRows = SECTION_IDS.map((section) => ({
    user_email: email,
    section,
    allowed: formData.get(`sec_${section}`) === "on",
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }));

  const { error: sectionError } = await supabase
    .from("user_sections")
    .upsert(sectionRows, { onConflict: "user_email,section" });
  if (sectionError) {
    if ((sectionError as { code?: string } | null)?.code === "42P01")
      return "شعبے کی اجازتیں محفوظ نہیں ہو سکیں — پہلے مرحلہ 53 کی SQL چلائیں۔";
    return "شعبے کی اجازتیں محفوظ نہیں ہو سکیں۔ دوبارہ کوشش کریں۔";
  }

  return null;
}

/** نیا عملہ شامل کریں — نیا مدرسہ نہیں بنتا، عملہ میرے مدرسے سے جڑتا ہے */
export async function addStaffMember(
  formData: FormData,
): Promise<ActionResult> {
  const email = clean(formData.get("email"), 200).toLowerCase();
  const name = clean(formData.get("name"), 100);
  const whatsapp = clean(formData.get("whatsapp"), 20);
  const designation = clean(formData.get("designation"), 100);
  const role = clean(formData.get("role"), 30);
  if (!validEmail(email)) return { error: "Gmail درست لکھیں۔" };
  if (!name) return { error: "عملے کا نام ضروری ہے۔" };
  if (!designation) return { error: "عہدہ لکھیں (مثلاً ناظم تعلیمات)۔" };
  if (!(ASSIGNABLE_ROLES as string[]).includes(role))
    return { error: "کردار درست منتخب کریں۔" };

  const checked = await requireOwner();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  // جس Gmail کا پہلے سے اپنا مدرسہ/منظوری ہے، اسے عملہ نہیں بنایا جا سکتا
  const { data: existing } = await supabase
    .from("approved_users")
    .select("id, status")
    .eq("email", email)
    .single();
  if (existing) {
    return {
      error:
        "اس Gmail کا اپنا مدرسہ پہلے سے ہے — اسے عملہ نہیں بنایا جا سکتا۔",
    };
  }

  const { data, error } = await supabase
    .from("approved_users")
    .insert({
      email,
      name,
      whatsapp: whatsapp || null,
      status: "approved",
      assigned_role: role as MadrasaRole,
      assigned_madrasa_id: madrasaId,
      member_type: "staff",
      designation,
      approved_by: userId,
    })
    .select("id")
    .single();
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23505")
      return { error: "یہ Gmail پہلے سے درج ہے۔" };
    return { error: "عملہ شامل نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }
  const staffId = (data as { id: string }).id;

  // اجازتیں — ہر ماڈیول کی واضح قطار
  const permError = await saveStaffPermissionRows(
    supabase,
    email,
    userId,
    formData,
  );
  if (permError) {
    // محفوظ رخ: اجازتیں نہ بنیں تو عملہ لاگ ان ہی نہ کر سکے
    // (ورنہ کوئی قطار نہ ہونے پر سب کچھ کھلا سمجھا جاتا)
    await supabase
      .from("approved_users")
      .update({ status: "disabled", updated_at: new Date().toISOString() })
      .eq("id", staffId);
    return { error: permError };
  }

  await writeAudit(supabase, madrasaId, userId, "staff_added", {
    approved_user_id: staffId,
    email,
    designation,
    role,
  });

  revalidatePath("/departments/staff-members");
  revalidatePath("/departments/users-permissions");
  return { ok: true };
}

/** عملے کی رسائی بند / بحال کریں — ریکارڈ کبھی حذف نہیں ہوتا */
export async function setStaffStatus(
  formData: FormData,
): Promise<ActionResult> {
  const id = clean(formData.get("id"), 100);
  const status = clean(formData.get("status"), 20);
  if (!id) return { error: "عملے کا رکن نہیں ملا۔" };
  if (status !== "approved" && status !== "disabled")
    return { error: "حالت درست منتخب کریں۔" };

  const checked = await requireOwner();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const target = await getOwnStaffById(supabase, id, madrasaId);
  if (!target) return { error: "عملے کا رکن نہیں ملا۔" };

  const { error } = await supabase
    .from("approved_users")
    .update({
      status: status as ApprovalStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: "حالت نہیں بدلی جا سکی۔ دوبارہ کوشش کریں۔" };

  await writeAudit(
    supabase,
    madrasaId,
    userId,
    status === "approved" ? "staff_reactivated" : "staff_disabled",
    {
      approved_user_id: target.id,
      email: target.email,
    },
  );

  revalidatePath("/departments/staff-members");
  revalidatePath("/departments/users-permissions");
  return { ok: true };
}

/** موجودہ عملے کی اجازتیں بدلیں — صرف میرے مدرسے کے عملے کی */
export async function setStaffPermissions(
  formData: FormData,
): Promise<ActionResult> {
  const email = clean(formData.get("user_email"), 200).toLowerCase();
  if (!validEmail(email)) return { error: "Gmail درست نہیں ہے۔" };

  const checked = await requireOwner();
  if ("error" in checked) return { error: checked.error };
  const { supabase, madrasaId, userId } = checked;

  const target = await getOwnStaffByEmail(supabase, email, madrasaId);
  if (!target) return { error: "عملے کا رکن نہیں ملا۔" };

  const permError = await saveStaffPermissionRows(
    supabase,
    email,
    userId,
    formData,
  );
  if (permError) return { error: permError };

  await writeAudit(supabase, madrasaId, userId, "permissions_updated", {
    user_email: email,
  });

  revalidatePath("/departments/staff-members");
  revalidatePath("/");
  return { ok: true };
}
