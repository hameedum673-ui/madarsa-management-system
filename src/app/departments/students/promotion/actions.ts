/**
 * ترقی کی تصدیق — صرف مالک / ایڈمن
 * جائزہ تازہ ڈیٹا سے دوبارہ بنتا ہے (فارم کی جماعتیں نہیں مانی جاتیں)؛
 * "دوبارہ" کے نشان صرف فارم سے لیے جاتے ہیں۔ ایک ہی upsert سے سب
 * اندراج بنتے ہیں — دوبارہ چلانے سے نقل نہیں بنتی۔
 */
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import {
  buildPromotionPreview,
  getAllAcademicYears,
  getCurrentAcademicYear,
} from "@/lib/academicYears";
import { t, type Lang } from "@/i18n/dictionary";

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

export async function promoteStudents(
  formData: FormData,
): Promise<{ ok: boolean; promoted?: number; error?: string }> {
  const rawLang = formData.get("lang");
  const lang: Lang = rawLang === "ar" ? "ar" : "ur";
  const supabase = await createClient();
  const [admin, owner] = await Promise.all([
    isAppAdmin(supabase),
    isMadrasaOwner(supabase),
  ]);
  if (!(admin || owner)) {
    return { ok: false, error: t(lang, "common.not_allowed") };
  }
  const mine = await getMyMadrasa(supabase);
  if (!mine) {
    return { ok: false, error: t(lang, "common.not_allowed") };
  }

  const targetId = String(formData.get("target_year_id") ?? "");
  const years = await getAllAcademicYears(supabase, mine.madrasaId);
  const source = await getCurrentAcademicYear(supabase, mine.madrasaId);
  const target = years.find((y) => y.id === targetId);
  if (
    !source ||
    !target ||
    target.id === source.id ||
    target.start_date <= source.start_date
  ) {
    return { ok: false, error: t(lang, "promotion.no_target") };
  }

  // جائزہ تازہ ڈیٹا سے — فارم صرف "دوبارہ" کے نشان بتاتا ہے
  const { data: studentsData } = await supabase
    .from("students")
    .select(
      "id, name, father_name, registration_number, class_name, department, section",
    )
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active");
  const { data: enrData } = await supabase
    .from("enrollments")
    .select("student_id, class_name, department, section")
    .eq("madrasa_id", mine.madrasaId)
    .eq("academic_year_id", source.id)
    .eq("status", "active");
  const { data: classData } = await supabase
    .from("classes")
    .select("name, department, section, sort_order")
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active");
  const preview = buildPromotionPreview(
    (studentsData ?? []) as {
      id: string;
      name: string;
      father_name: string;
      registration_number: string;
      class_name: string | null;
      department: string;
      section: string;
    }[],
    (enrData ?? []) as {
      student_id: string;
      class_name: string | null;
      department: string;
      section: string;
    }[],
    (classData ?? []) as {
      name: string;
      department: string;
      section: string;
      sort_order: number;
    }[],
  );
  const payload = preview.rows.map((row) => ({
    madrasa_id: mine.madrasaId,
    student_id: row.student_id,
    academic_year_id: target.id,
    class_name: formData.get(`repeat_${row.student_id}`)
      ? row.current_class
      : row.next_class,
    department: row.department,
    section: row.section,
  }));
  if (payload.length === 0) {
    return { ok: false, error: t(lang, "promotion.none") };
  }
  const { error } = await supabase
    .from("enrollments")
    .upsert(payload, { onConflict: "student_id,academic_year_id" });
  if (error) {
    return { ok: false, error: t(lang, "promotion.err.save") };
  }
  await writeAudit(supabase, mine.madrasaId, mine.userId, "students_promoted", {
    year: target.label,
    count: String(payload.length),
  });
  revalidatePath("/departments/students/promotion");
  revalidatePath("/departments/students");
  revalidatePath("/departments/settings");
  return { ok: true, promoted: payload.length };
}
