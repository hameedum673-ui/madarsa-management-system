/**
 * مرحلہ 9 — داخلوں کے Server Actions (درخواست / منظوری / مسترد)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * منظوری پر طالبہ کا ریکارڈ خود بنتا ہے (رجسٹریشن نمبر خودکار) اور داخلہ
 * اس سے جڑ جاتا ہے — ڈیٹا ایک جگہ سے دوسری جگہ جڑا ہوا۔
 * داخلے کا ریکارڈ کبھی حذف نہیں ہوتا — غلط درخواست مسترد کی جاتی ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
} from "@/lib/permissions";
import { ADMISSION_TYPE_IDS } from "@/lib/admissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  getMyMadrasa,
  type AdmissionType,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";
import { isLang, t, type Lang } from "@/i18n/dictionary";

/** مرحلہ 103 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v = typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

type ActionResult = { ok: true } | { error: string };
type AddResult =
  | { ok: true; id: string }
  | { error: string };

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

interface AdmissionFields {
  applicantName: string;
  fatherName: string;
  guardianName: string;
  guardianPhone: string;
  whatsappNumber: string;
  dateOfBirth: string;
  department: DepartmentId;
  section: SectionId;
  className: string;
  admissionDate: string;
  admissionType: AdmissionType;
  studentId: string;
  district: string;
  previousMadrasa: string;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت (زبان کے مطابق) */
function validateFields(
  formData: FormData,
  lang: Lang,
): { fields: AdmissionFields } | { error: string } {
  const applicantName = clean(formData.get("applicant_name"), 100);
  const fatherName = clean(formData.get("father_name"), 100);
  const guardianName = clean(formData.get("guardian_name"), 100);
  const guardianPhone = clean(formData.get("guardian_phone"), 20);
  const whatsappNumber = clean(formData.get("whatsapp_number"), 20);
  const dateOfBirth = clean(formData.get("date_of_birth"), 10);
  const department = clean(formData.get("department"), 20);
  const section = clean(formData.get("section"), 20);
  const className = clean(formData.get("class_name"), 100);
  const admissionDate = clean(formData.get("admission_date"), 10);
  const admissionType = clean(formData.get("admission_type"), 20);
  const studentId = clean(formData.get("student_id"), 50);
  const district = clean(formData.get("district"), 100);
  const previousMadrasa = clean(formData.get("previous_madrasa"), 200);
  const note = clean(formData.get("note"), 500);

  if (!ADMISSION_TYPE_IDS.includes(admissionType as AdmissionType))
    return { error: t(lang, "admission.err.type_invalid") };
  if (admissionType === "returning" && !studentId)
    return { error: t(lang, "admission.err.old_required") };
  if (!applicantName) return { error: t(lang, "student.err.name_required") };
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
      applicantName,
      fatherName,
      guardianName,
      guardianPhone,
      whatsappNumber,
      dateOfBirth,
      department: department as DepartmentId,
      section: section as SectionId,
      className,
      admissionDate,
      admissionType: admissionType as AdmissionType,
      studentId,
      district,
      previousMadrasa,
      note,
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

/** نئی داخلہ درخواست درج کریں — حالت «زیرِ غور» سے شروع ہوتی ہے */
export async function addAdmission(formData: FormData): Promise<AddResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "admissions"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: t(lang, "student.err.section_denied") };

  // مرحلہ 74 — قدیم داخلہ: نام/والد وغیرہ طالبہ کے ریکارڈ سے
  // (فارم کی لکھی ہوئی قیمتوں پر بھروسا نہیں — ریکارڈ ہی سچ ہے)
  let applicantName = f.applicantName;
  let fatherName = f.fatherName;
  let guardianName = f.guardianName;
  let guardianPhone = f.guardianPhone;
  let whatsappNumber = f.whatsappNumber;
  let dateOfBirth = f.dateOfBirth;
  if (f.admissionType === "returning") {
    const { data: linked, error: linkedError } = await supabase
      .from("students")
      .select(
        "id, name, father_name, guardian_name, guardian_phone, whatsapp_number, date_of_birth",
      )
      .eq("id", f.studentId)
      .eq("madrasa_id", mine.madrasaId)
      .single();
    if (linkedError || !linked) {
      return { error: t(lang, "admission.err.old_not_found") };
    }
    applicantName = linked.name as string;
    fatherName = linked.father_name as string;
    guardianName = (linked.guardian_name as string | null) ?? "";
    guardianPhone = (linked.guardian_phone as string | null) ?? "";
    whatsappNumber = (linked.whatsapp_number as string | null) ?? "";
    dateOfBirth = (linked.date_of_birth as string | null) ?? "";
  }

  const { data, error } = await supabase
    .from("admissions")
    .insert({
      madrasa_id: mine.madrasaId,
      applicant_name: applicantName,
      father_name: fatherName,
      guardian_name: guardianName || null,
      guardian_phone: guardianPhone || null,
      whatsapp_number: whatsappNumber || null,
      date_of_birth: dateOfBirth || null,
      department: f.department,
      section: f.section,
      class_name: f.className || null,
      admission_date: f.admissionDate,
      admission_type: f.admissionType,
      student_id: f.admissionType === "returning" ? f.studentId : null,
      district: f.district || null,
      previous_madrasa: f.previousMadrasa || null,
      note: f.note || null,
      status: "pending",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "admission.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "admission_created", {
    admission_id: data.id as string,
    name: applicantName,
  });

  revalidatePath("/departments/admissions");
  return { ok: true, id: data.id as string };
}

/** داخلہ منظور کریں — طالبہ کا ریکارڈ خود بنتا ہے اور داخلہ اس سے جڑ جاتا ہے */
export async function approveAdmission(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "admissions"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // صرف اپنے مدرسے کی زیرِ غور درخواست منظور ہو سکتی ہے
  const { data: admission, error: fetchError } = await supabase
    .from("admissions")
    .select("*")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .single();

  if (fetchError || !admission) {
    return { error: t(lang, "admission.err.not_found") };
  }
  if (admission.status !== "pending") {
    return { error: t(lang, "admission.err.already_decided") };
  }
  // مرحلہ 54 — بند شعبے کا داخلہ منظور نہیں ہو سکتا
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      ((admission.section as string) || "banat") as SectionId,
    )
  )
    return { error: t(lang, "admission.err.section_denied_approve") };

  // مرحلہ 74 — قدیم داخلہ: نیا ریکارڈ نہیں، پرانی طالبہ کا ریکارڈ بدلے گا
  const admissionType = ((admission.admission_type as string) || "new") as AdmissionType;
  if (admissionType === "returning") {
    const returningStudentId = admission.student_id as string | null;
    if (!returningStudentId) {
      return { error: t(lang, "admission.err.no_student_linked") };
    }
    const { data: linked, error: linkedError } = await supabase
      .from("students")
      .select("id, registration_number, name")
      .eq("id", returningStudentId)
      .eq("madrasa_id", mine.madrasaId)
      .single();
    if (linkedError || !linked) {
      return { error: t(lang, "admission.err.linked_not_found") };
    }
    // مرحلہ 75 — ضلع صرف تب بدلے جب داخلے میں لکھا ہو (خالی ہو تو
    // پرانی طالبہ کا ضلع ویسا ہی رہے — مٹے نہیں)
    const returningUpdate: Record<string, unknown> = {
      department: admission.department as string,
      section: (admission.section as string) || "banat",
      class_name: (admission.class_name as string | null) ?? null,
      admission_type: "returning",
      status: "active",
    };
    if ((admission.district as string | null) ?? null) {
      returningUpdate.district = admission.district as string;
    }
    const { error: updateError } = await supabase
      .from("students")
      .update(returningUpdate)
      .eq("id", returningStudentId)
      .eq("madrasa_id", mine.madrasaId);
    if (updateError) {
      return { error: t(lang, "admission.err.student_update_failed") };
    }
    const { error: approveError } = await supabase
      .from("admissions")
      .update({
        status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("madrasa_id", mine.madrasaId);
    if (approveError) {
      return { error: t(lang, "admission.err.approve_failed") };
    }
    await writeAudit(
      supabase,
      mine.madrasaId,
      mine.userId,
      "admission_approved",
      {
        admission_id: id,
        student_id: returningStudentId,
        registration_number: linked.registration_number as string,
        name: linked.name as string,
      },
    );
    revalidatePath("/departments/admissions");
    revalidatePath(`/departments/admissions/${id}`);
    revalidatePath("/departments/students");
    revalidatePath("/");
    return { ok: true };
  }

  // اگلا رجسٹریشن نمبر: اپنے مدرسے کی طالبات کی گنتی + 1
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const registrationNumber = String((count ?? 0) + 1).padStart(4, "0");

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      madrasa_id: mine.madrasaId,
      registration_number: registrationNumber,
      name: admission.applicant_name as string,
      father_name: admission.father_name as string,
      guardian_name: (admission.guardian_name as string | null) ?? null,
      guardian_phone: (admission.guardian_phone as string | null) ?? null,
      whatsapp_number: (admission.whatsapp_number as string | null) ?? null,
      date_of_birth: (admission.date_of_birth as string | null) ?? null,
      department: admission.department as string,
      section: (admission.section as string) || "banat",
      class_name: (admission.class_name as string | null) ?? null,
      admission_date: admission.admission_date as string,
      admission_type: "new",
      address: null,
      district: (admission.district as string | null) ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (studentError || !student) {
    if ((studentError as { code?: string } | null)?.code === "23505")
      return { error: t(lang, "student.err.reg_conflict") };
    return { error: t(lang, "admission.err.student_create_failed") };
  }

  const { error: linkError } = await supabase
    .from("admissions")
    .update({
      status: "approved",
      student_id: student.id as string,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId);

  if (linkError) {
    // طالبہ بن گئی مگر داخلہ جڑ نہ سکا — صاف پیغام (طالبہ کا ریکارڈ محفوظ ہے)
    return {
      error: t(lang, "admission.err.link_failed"),
    };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "admission_approved", {
    admission_id: id,
    student_id: student.id as string,
    registration_number: registrationNumber,
    name: admission.applicant_name as string,
  });
  await writeAudit(supabase, mine.madrasaId, mine.userId, "student_created", {
    student_id: student.id as string,
    registration_number: registrationNumber,
    name: admission.applicant_name as string,
  });

  revalidatePath("/departments/admissions");
  revalidatePath(`/departments/admissions/${id}`);
  revalidatePath("/departments/students");
  revalidatePath("/");
  return { ok: true };
}

/** داخلہ مسترد کریں — کوئی طالبہ نہیں بنے گی، درخواست «مسترد» رہ جائے گی */
export async function rejectAdmission(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "admissions"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("admissions")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "pending")
    .select("id, applicant_name")
    .single();

  if (error || !data) {
    return { error: t(lang, "admission.err.reject_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "admission_rejected", {
    admission_id: data.id as string,
    name: data.applicant_name as string,
  });

  revalidatePath("/departments/admissions");
  revalidatePath(`/departments/admissions/${id}`);
  return { ok: true };
}
