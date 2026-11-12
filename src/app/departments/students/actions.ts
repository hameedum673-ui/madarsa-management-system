/**
 * مرحلہ 4 — طلبہ کے Server Actions (اضافہ / تبدیلی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * رجسٹریشن نمبر خودکار ہے: اپنے مدرسے کی طالبات کی گنتی + 1، چار ہندسوں میں۔
 * ریکارڈ کبھی حذف نہیں ہوتا — خارج صرف status سے ہوتا ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
  MODULE_DENIED_ERROR,
} from "@/lib/permissions";
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

interface StudentFields {
  name: string;
  fatherName: string;
  guardianName: string;
  guardianPhone: string;
  whatsappNumber: string;
  dateOfBirth: string;
  department: DepartmentId;
  section: SectionId;
  className: string;
  admissionDate: string;
  address: string;
  district: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: StudentFields } | { error: string } {
  const name = clean(formData.get("name"), 100);
  const fatherName = clean(formData.get("father_name"), 100);
  const guardianName = clean(formData.get("guardian_name"), 100);
  const guardianPhone = clean(formData.get("guardian_phone"), 20);
  const whatsappNumber = clean(formData.get("whatsapp_number"), 20);
  const dateOfBirth = clean(formData.get("date_of_birth"), 10);
  const department = clean(formData.get("department"), 20);
  const section = clean(formData.get("section"), 20);
  const className = clean(formData.get("class_name"), 100);
  const admissionDate = clean(formData.get("admission_date"), 10);
  const address = clean(formData.get("address"), 500);
  const district = clean(formData.get("district"), 100);

  if (!name) return { error: "طالبہ کا نام ضروری ہے۔" };
  if (!fatherName) return { error: "والد کا نام ضروری ہے۔" };
  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { error: "شعبہ درست منتخب کریں (حفظ، ناظرہ یا درسِ نظامی)۔" };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: "شعبہ (بنین / بنات) درست منتخب کریں۔" };
  if (!validDate(admissionDate))
    return { error: "داخلہ کی تاریخ درست نہیں ہے۔" };
  if (!notFuture(admissionDate))
    return { error: "داخلہ کی تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (dateOfBirth && !validDate(dateOfBirth))
    return { error: "تاریخِ پیدائش درست نہیں ہے۔" };
  if (dateOfBirth && !notFuture(dateOfBirth))
    return { error: "تاریخِ پیدائش آج سے آگے نہیں ہو سکتی۔" };
  if (!validPhone(guardianPhone))
    return { error: "رابطہ نمبر درست نہیں ہے۔" };
  if (!validPhone(whatsappNumber))
    return { error: "واٹس ایپ نمبر درست نہیں ہے۔" };

  return {
    fields: {
      name,
      fatherName,
      guardianName,
      guardianPhone,
      whatsappNumber,
      dateOfBirth,
      department: department as DepartmentId,
      section: section as SectionId,
      className,
      admissionDate,
      address,
      district,
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

/** نئی طالبہ شامل کریں */
export async function addStudent(formData: FormData): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "students"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: "اس شعبے میں ریکارڈ درج کرنے کی اجازت نہیں ہے۔" };

  // اگلا رجسٹریشن نمبر: اپنے مدرسے کی طالبات کی گنتی + 1
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const registrationNumber = String((count ?? 0) + 1).padStart(4, "0");

  const { data, error } = await supabase
    .from("students")
    .insert({
      madrasa_id: mine.madrasaId,
      registration_number: registrationNumber,
      name: f.name,
      father_name: f.fatherName,
      guardian_name: f.guardianName || null,
      guardian_phone: f.guardianPhone || null,
      whatsapp_number: f.whatsappNumber || null,
      date_of_birth: f.dateOfBirth || null,
      department: f.department,
      section: f.section,
      class_name: f.className || null,
      admission_date: f.admissionDate,
      address: f.address || null,
      district: f.district || null,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    // نمبر ٹکرا جائے (دو لوگ ایک ساتھ لکھیں) تو دوبارہ کوشش کا کہیں
    if ((error as { code?: string } | null)?.code === "23505")
      return { error: "رجسٹریشن نمبر ٹکرا گیا — دوبارہ کوشش کریں۔" };
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "student_created", {
    student_id: data.id as string,
    registration_number: registrationNumber,
    name: f.name,
  });

  revalidatePath("/departments/students");
  revalidatePath("/");
  return { ok: true };
}

/** طالبہ کا ریکارڈ تبدیل کریں — رجسٹریشن نمبر اور مدرسہ کبھی نہیں بدلتے */
export async function updateStudent(
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
  if (!(await isModuleAllowedForMe(supabase, "students"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: "اس شعبے میں ریکارڈ درج کرنے کی اجازت نہیں ہے۔" };

  // RLS خود یقین دلاتی ہے کہ یہ طالبہ اسی مدرسے کی ہے
  const { data, error } = await supabase
    .from("students")
    .update({
      name: f.name,
      father_name: f.fatherName,
      guardian_name: f.guardianName || null,
      guardian_phone: f.guardianPhone || null,
      whatsapp_number: f.whatsappNumber || null,
      date_of_birth: f.dateOfBirth || null,
      department: f.department,
      section: f.section,
      class_name: f.className || null,
      admission_date: f.admissionDate,
      address: f.address || null,
      district: f.district || null,
      status: status as StudentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .select("id, registration_number")
    .single();

  if (error || !data) {
    return { error: "تبدیلی محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "student_updated", {
    student_id: data.id as string,
    registration_number: data.registration_number as string,
    name: f.name,
  });

  revalidatePath("/departments/students");
  revalidatePath(`/departments/students/${id}`);
  revalidatePath("/");
  return { ok: true };
}
