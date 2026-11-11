/**
 * مرحلہ 13 — عملے کے Server Actions (اضافہ / تبدیلی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * ریکارڈ کبھی حذف نہیں ہوتا — خارج صرف status سے ہوتا ہے۔
 * نوٹ: تنخواہ اس ماڈیول میں نہیں ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  getMyMadrasa,
  type DepartmentId,
  type SectionId,
  type StudentStatus,
} from "@/lib/students";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function notFuture(value: string): boolean {
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

function validPhone(value: string): boolean {
  return value === "" || /^[0-9+\-()\s]{7,20}$/.test(value);
}

function validCnic(value: string): boolean {
  return value === "" || /^[0-9-]{13,15}$/.test(value);
}

interface StaffFields {
  name: string;
  fatherName: string;
  phone: string;
  cnic: string;
  qualification: string;
  department: DepartmentId;
  section: SectionId;
  position: string;
  joiningDate: string;
  address: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: StaffFields } | { error: string } {
  const name = clean(formData.get("name"), 100);
  const fatherName = clean(formData.get("father_name"), 100);
  const phone = clean(formData.get("phone"), 20);
  const cnic = clean(formData.get("cnic"), 15);
  const qualification = clean(formData.get("qualification"), 200);
  const department = clean(formData.get("department"), 20);
  const section = clean(formData.get("section"), 20);
  const position = clean(formData.get("position"), 100);
  const joiningDate = clean(formData.get("joining_date"), 10);
  const address = clean(formData.get("address"), 500);

  if (!name) return { error: "عملے کا نام ضروری ہے۔" };
  if (!fatherName) return { error: "والد کا نام ضروری ہے۔" };
  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { error: "شعبہ درست منتخب کریں (حفظ، ناظرہ یا درسِ نظامی)۔" };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: "شعبہ (بنین / بنات) درست منتخب کریں۔" };
  if (!validDate(joiningDate))
    return { error: "تقرری کی تاریخ درست نہیں ہے۔" };
  if (!notFuture(joiningDate))
    return { error: "تقرری کی تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!validPhone(phone)) return { error: "فون نمبر درست نہیں ہے۔" };
  if (!validCnic(cnic))
    return { error: "شناختی کارڈ نمبر درست نہیں ہے (13 ہندسے)۔" };

  return {
    fields: {
      name,
      fatherName,
      phone,
      cnic,
      qualification,
      department: department as DepartmentId,
      section: section as SectionId,
      position,
      joiningDate,
      address,
    },
  };
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

/** نیا عملہ شامل کریں */
export async function addStaff(formData: FormData): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: "اس شعبے میں ریکارڈ درج کرنے کی اجازت نہیں ہے۔" };

  const { data, error } = await supabase
    .from("staff")
    .insert({
      madrasa_id: mine.madrasaId,
      name: f.name,
      father_name: f.fatherName,
      phone: f.phone || null,
      cnic: f.cnic || null,
      qualification: f.qualification || null,
      department: f.department,
      section: f.section,
      position: f.position || null,
      joining_date: f.joiningDate,
      address: f.address || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "staff_created", {
    staff_id: data.id as string,
    name: f.name,
  });

  revalidatePath("/departments/staff");
  revalidatePath("/");
  return { ok: true };
}

/** عملے کا ریکارڈ تبدیل کریں — مدرسہ کبھی نہیں بدلتا */
export async function updateStaff(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "withdrawn")
    return { error: "حالت درست منتخب کریں (فعال یا خارج)۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: "اس شعبے میں ریکارڈ درج کرنے کی اجازت نہیں ہے۔" };

  // RLS خود یقین دلاتی ہے کہ یہ فرد اسی مدرسے کا ہے
  const { data, error } = await supabase
    .from("staff")
    .update({
      name: f.name,
      father_name: f.fatherName,
      phone: f.phone || null,
      cnic: f.cnic || null,
      qualification: f.qualification || null,
      department: f.department,
      section: f.section,
      position: f.position || null,
      joining_date: f.joiningDate,
      address: f.address || null,
      status: status as StudentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "تبدیلی محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "staff_updated", {
    staff_id: data.id as string,
    name: f.name,
  });

  revalidatePath("/departments/staff");
  revalidatePath(`/departments/staff/${id}`);
  revalidatePath("/");
  return { ok: true };
}
