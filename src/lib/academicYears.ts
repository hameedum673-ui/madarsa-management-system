/**
 * تعلیمی سال کی بنیاد — مددگار (migration 056)
 *
 * سال ہجری ہے: نیا سال 10 شوال سے شروع، رجب کے آخر تک؛ شعبان +
 * رمضان چھٹیاں۔ سال کا لیبل اس کے شوال والا ہجری سال (جیسے "1447ھ")۔
 *
 * یہ مددگار کبھی غلطی نہیں پھینکتے: سال نہ بنا ہو یا migration
 * ابھی نہ چلی ہو تو خاموشی سے کچھ نہیں کرتے — تاکہ داخلہ اور
 * ریکارڈ کی تبدیلی کبھی ان کی وجہ سے نہ رکے۔
 */
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

/** اپنے مدرسے کے تمام سال — موجودہ پہلے، پھر پرانے (شروع کی تاریخ کے لحاظ سے) */
export async function getAllAcademicYears(
  supabase: ServerClient,
  madrasaId: string,
): Promise<AcademicYear[]> {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, label, start_date, end_date, is_current")
      .eq("madrasa_id", madrasaId)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false });
    if (error || !data) return [];
    return data as AcademicYear[];
  } catch {
    return [];
  }
}

/** اپنے مدرسے کے پرانے سال (موجودہ نہیں) — شروع کی تاریخ کے لحاظ سے نئے سے پرانے */
export async function getPastAcademicYears(
  supabase: ServerClient,
  madrasaId: string,
): Promise<AcademicYear[]> {
  const all = await getAllAcademicYears(supabase, madrasaId);
  return all.filter((y) => !y.is_current);
}

export interface PastEnrollment {
  year_id: string;
  label: string;
  start_date: string;
  class_name: string | null;
}

/** طالبہ کے پرانے سالوں کے داخلے — سال کے لیبل کے ساتھ، نئے سے پرانے */
export async function getStudentPastEnrollments(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
): Promise<PastEnrollment[]> {
  try {
    const years = await getPastAcademicYears(supabase, madrasaId);
    if (years.length === 0) return [];
    const byId = new Map(years.map((y) => [y.id, y]));
    const { data, error } = await supabase
      .from("enrollments")
      .select("academic_year_id, class_name")
      .eq("madrasa_id", madrasaId)
      .eq("student_id", studentId)
      .in(
        "academic_year_id",
        years.map((y) => y.id),
      );
    if (error || !data) return [];
    return (data as { academic_year_id: string; class_name: string | null }[])
      .map((row) => {
        const year = byId.get(row.academic_year_id);
        if (!year) return null;
        return {
          year_id: year.id,
          label: year.label,
          start_date: year.start_date,
          class_name: row.class_name,
        };
      })
      .filter((row): row is PastEnrollment => row !== null)
      .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  } catch {
    return [];
  }
}

/** اپنے مدرسے کا موجودہ سال (نہ ہو تو null) */
export async function getCurrentAcademicYear(
  supabase: ServerClient,
  madrasaId: string,
): Promise<AcademicYear | null> {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, label, start_date, end_date, is_current")
      .eq("madrasa_id", madrasaId)
      .eq("is_current", true)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as AcademicYear;
  } catch {
    return null;
  }
}

/**
 * تاریخ سے تعلیمی سال نکالیں — خالص حساب (migration 057 کے
 * امتحان والے اصول جیسا؛ جانچ کے لیے الگ رکھا گیا ہے)۔
 * تاریخیں ISO شکل (YYYY-MM-DD) میں ہیں، اس لیے لفظی موازنہ درست ہے۔
 *
 *   * تاریخ کسی سال کے اندر (start_date..end_date) → وہی سال
 *   * تاریخ شعبان–رمضان کے وقفے میں (کوئی سال ختم ہو چکا، اگلا ابھی
 *     شروع نہیں ہوا) → آنے والا سال (وقفے میں آنے والا سال ہی
 *     موجودہ مانا جاتا ہے)
 *   * ورنہ → null (پہلے سال سے بھی پرانی تاریخ، یا آنے والا سال
 *     ابھی بنا ہی نہیں)
 */
export function pickAcademicYearForDate(
  years: AcademicYear[],
  date: string,
): AcademicYear | null {
  if (years.length === 0 || !date) return null;
  const inside = years.find(
    (y) => date >= y.start_date && date <= y.end_date,
  );
  if (inside) return inside;
  const ended = years.some((y) => y.end_date < date);
  if (!ended) return null;
  const upcoming = [...years]
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
    .find((y) => y.start_date > date);
  return upcoming ?? null;
}

/**
 * تاریخ سے اپنے مدرسے کے تعلیمی سال کا id نکالیں — امتحان بناتے /
 * بدلتے وقت سال تاریخ سے خود لگتا ہے۔ سال نہ بنا ہو یا migration
 * ابھی نہ چلی ہو تو null — کبھی نہیں پھینکتا۔
 */
export async function deriveAcademicYearId(
  supabase: ServerClient,
  madrasaId: string,
  date: string,
): Promise<string | null> {
  try {
    const years = await getAllAcademicYears(supabase, madrasaId);
    const year = pickAcademicYearForDate(years, date);
    return year ? year.id : null;
  } catch {
    return null;
  }
}

/**
 * طالبہ کو موجودہ سال میں درج کریں (یا جماعت بدلیں) — ایک طالبہ،
 * ایک سال، ایک قطار۔ سال نہ ہو تو کچھ نہیں ہوتا۔ کبھی نہیں پھینکتا۔
 */
export async function upsertEnrollment(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
  className: string | null,
  department: string,
  section: string,
): Promise<void> {
  try {
    const year = await getCurrentAcademicYear(supabase, madrasaId);
    if (!year) return;
    await supabase.from("enrollments").upsert(
      {
        madrasa_id: madrasaId,
        student_id: studentId,
        academic_year_id: year.id,
        class_name: className,
        department,
        section,
      },
      { onConflict: "student_id,academic_year_id" },
    );
  } catch {
    // سال کی میز نہ ہو یا کوئی خرابی ہو — اصل کام نہیں رکنا چاہیے
  }
}

/**
 * طالبہ کو بتائے ہوئے سال میں درج کریں (یا جماعت بدلیں) — ایک طالبہ،
 * ایک سال، ایک قطار۔ سال کا id صاف طور پر دیا جاتا ہے (موجودہ سال کی
 * شرط نہیں) — پرانے سالوں کے داخلے کے لیے۔ کبھی نہیں پھینکتا۔
 */
export async function upsertEnrollmentForYear(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
  yearId: string,
  className: string | null,
  department: string,
  section: string,
): Promise<void> {
  try {
    await supabase.from("enrollments").upsert(
      {
        madrasa_id: madrasaId,
        student_id: studentId,
        academic_year_id: yearId,
        class_name: className,
        department,
        section,
      },
      { onConflict: "student_id,academic_year_id" },
    );
  } catch {
    // سال کی میز نہ ہو یا کوئی خرابی ہو — اصل کام نہیں رکنا چاہیے
  }
}
