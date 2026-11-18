/**
 * تعلیمی سال کی بنیاد — مددگار (migration 056)
 *
 * سال ہجری ہے: نیا سال 10 شوال سے شروع، رجب کے آخر تک؛ شعبان +
 * رمضان چھٹیاں۔ سال کا لیبل اس کے شوال والا ہجری سال (جیسے "1447ھ")۔
 *
 * یہ دونوں کام کبھی غلطی نہیں پھینکتے: سال نہ بنا ہو یا migration
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
