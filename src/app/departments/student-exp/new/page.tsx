/**
 * مرحلہ 22 — نیا خرچ درج کرنے کا صفحہ
 * فعال طلبہ کی فہرست دکھائی جاتی ہے۔ میز ابھی نہ بنی ہو (migration 016 نہ
 * چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import StudentExpenseForm from "@/app/departments/student-exp/StudentExpenseForm";
import { addStudentExpense } from "@/app/departments/student-exp/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import type { Student } from "@/lib/students";

export default async function NewStudentExpPage() {
  const supabase = await createClient();
  const lang = await getMyLanguage();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("status", "active")
    .order("registration_number", { ascending: true });

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const students = (data ?? []) as Student[];

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/student-exp" />
          <h2>{t(lang, "studentexp.new_title")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">{t(lang, "students.table_missing")}</p>
        ) : students.length === 0 ? (
          <p className="empty-state">{t(lang, "welfare.no_students")}</p>
        ) : (
          <StudentExpenseForm
            students={students}
            action={addStudentExpense}
            lang={lang}
          />
        )}
      </div>
    </div>
  );
}
