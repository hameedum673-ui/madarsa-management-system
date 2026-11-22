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
} from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  getMyMadrasa,
  type DepartmentId,
  type SectionId,
  type StudentStatus,
} from "@/lib/students";
import {
  getCurrentAcademicYear,
  upsertEnrollment,
  upsertEnrollmentForYear,
} from "@/lib/academicYears";
import { isLang, t, type Lang } from "@/i18n/dictionary";

/** مرحلہ 103 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v = typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

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

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت (زبان کے مطابق) */
function validateFields(
  formData: FormData,
  lang: Lang,
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

  if (!name) return { error: t(lang, "student.err.name_required") };
  if (!fatherName) return { error: t(lang, "student.err.father_required") };
  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { error: t(lang, "student.err.dept_invalid") };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: t(lang, "student.err.section_invalid") };
  if (!validDate(admissionDate))
    return { error: t(lang, "student.err.admission_date_invalid") };
  if (!notFuture(admissionDate))
    return { error: t(lang, "student.err.admission_date_future") };
  if (dateOfBirth && !validDate(dateOfBirth))
    return { error: t(lang, "student.err.dob_invalid") };
  if (dateOfBirth && !notFuture(dateOfBirth))
    return { error: t(lang, "student.err.dob_future") };
  if (!validPhone(guardianPhone))
    return { error: t(lang, "student.err.phone_invalid") };
  if (!validPhone(whatsappNumber))
    return { error: t(lang, "student.err.whatsapp_invalid") };

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
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "students"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: t(lang, "student.err.section_denied") };

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
      return { error: t(lang, "student.err.reg_conflict") };
    return { error: t(lang, "student.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "student_created", {
    student_id: data.id as string,
    registration_number: registrationNumber,
    name: f.name,
  });

  // تعلیمی سال — موجودہ سال میں داخلے کی قطار (سال نہ ہو تو کچھ نہیں ہوتا)
  await upsertEnrollment(
    supabase,
    mine.madrasaId,
    data.id as string,
    f.className || null,
    f.department,
    f.section,
  );

  revalidatePath("/departments/students");
  revalidatePath("/");
  return { ok: true };
}

/** طالبہ کا ریکارڈ تبدیل کریں — رجسٹریشن نمبر اور مدرسہ کبھی نہیں بدلتے */
export async function updateStudent(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "withdrawn")
    return {
      error: t(
        lang,
        f.section === "banin"
          ? "student.err.status_invalid_m"
          : "student.err.status_invalid",
      ),
    };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "students"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: t(lang, "student.err.section_denied") };

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
    return { error: t(lang, "student.err.update_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "student_updated", {
    student_id: data.id as string,
    registration_number: data.registration_number as string,
    name: f.name,
  });

  // تعلیمی سال — موجودہ سال کی قطار میں جماعت بدلیں (سال نہ ہو تو کچھ نہیں ہوتا)
  await upsertEnrollment(
    supabase,
    mine.madrasaId,
    id,
    f.className || null,
    f.department,
    f.section,
  );

  revalidatePath("/departments/students");
  revalidatePath(`/departments/students/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * طالبہ کو پرانے سال میں درج کریں (یا اس سال کی جماعت بدلیں) — ایک طالبہ،
 * ایک سال، ایک قطار۔ صرف پرانا سال چنا جا سکتا ہے (موجودہ سال نہیں —
 * اس کی جماعت ریکارڈ کی تبدیلی سے بدلتی ہے)۔ اجازت وہی جو ریکارڈ
 * بدلنے کی ہے (ماڈیول "students")۔
 */
export async function enrollInPastYear(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const yearId = clean(formData.get("academic_year_id"), 100);
  const className = clean(formData.get("class_name"), 100);
  if (!yearId) return { error: t(lang, "student.past_enroll.err.year") };
  if (!className) return { error: t(lang, "student.past_enroll.err.class") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "students"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // طالبہ اپنے مدرسے کی ہو اور شعبہ کھلا ہو
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, registration_number, name, department, section")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .single();
  if (studentError || !student) {
    return { error: t(lang, "student.err.update_failed") };
  }
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(student.section as SectionId))
    return { error: t(lang, "student.err.section_denied") };

  // سال اپنے مدرسے کا پرانا سال ہو (موجودہ نہیں)
  const { data: year, error: yearError } = await supabase
    .from("academic_years")
    .select("id, label, is_current")
    .eq("id", yearId)
    .eq("madrasa_id", mine.madrasaId)
    .single();
  if (yearError || !year || (year.is_current as boolean)) {
    return { error: t(lang, "student.past_enroll.err.year") };
  }

  await upsertEnrollmentForYear(
    supabase,
    mine.madrasaId,
    id,
    yearId,
    className,
    student.department as string,
    student.section as string,
  );

  // تصدیق — قطار واقعی بن گئی ہو (مددگار غلطی نہیں پھینکتا، اس لیے
  // یہاں خود جانچتے ہیں؛ نہ بنی ہو تو غلطی دکھائیں، کامیابی کا جھوٹ نہیں)
  const { data: saved, error: savedError } = await supabase
    .from("enrollments")
    .select("id, class_name")
    .eq("student_id", id)
    .eq("academic_year_id", yearId)
    .limit(1);
  if (savedError || !saved || saved.length === 0) {
    return { error: t(lang, "student.past_enroll.err.failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "past_enrollment_saved", {
    student_id: id,
    registration_number: student.registration_number as string,
    name: student.name as string,
    year_id: yearId,
    year_label: year.label as string,
    class_name: className,
  });

  revalidatePath(`/departments/students/${id}`);
  revalidatePath("/departments/students");
  return { ok: true };
}

/**
 * طالبہ کو موجودہ سال میں داخلہ دیں — طالبہ کی تفصیل کا صفحہ۔
 * درآمد میں غلط سال چننے پر درست کرنے کے لیے (مثال: 1446/47 کی
 * بجائے 1447/48ھ)۔ طالب علم کی موجودہ جماعت سے اندراج بنتا ہے۔
 */
export async function enrollInCurrentYear(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "students"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // طالبہ اپنے مدرسے کی ہو اور شعبہ کھلا ہو
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id, registration_number, name, department, section, class_name")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .single();
  if (studentError || !student) {
    return { error: t(lang, "student.err.update_failed") };
  }
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(student.section as SectionId))
    return { error: t(lang, "student.err.section_denied") };

  // موجودہ سال اپنے مدرسے کا ہو
  const year = await getCurrentAcademicYear(supabase, mine.madrasaId);
  if (!year) {
    return { error: t(lang, "student.current_enroll.err.no_year") };
  }

  await upsertEnrollment(
    supabase,
    mine.madrasaId,
    id,
    student.class_name as string | null,
    student.department as string,
    student.section as string,
  );

  // تصدیق — قطار واقعی بن گئی ہو (مددگار غلطی نہیں پھینکتا، اس لیے
  // یہاں خود جانچتے ہیں؛ نہ بنی ہو تو غلطی دکھائیں، کامیابی کا جھوٹ نہیں)
  const { data: saved, error: savedError } = await supabase
    .from("enrollments")
    .select("id, class_name")
    .eq("student_id", id)
    .eq("academic_year_id", year.id)
    .limit(1);
  if (savedError || !saved || saved.length === 0) {
    return { error: t(lang, "student.current_enroll.err.failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "current_enrollment_saved", {
    student_id: id,
    registration_number: student.registration_number as string,
    name: student.name as string,
    year_id: year.id,
    year_label: year.label as string,
    class_name: (student.class_name as string | null) ?? "",
  });

  revalidatePath(`/departments/students/${id}`);
  revalidatePath("/departments/students");
  return { ok: true };
}
