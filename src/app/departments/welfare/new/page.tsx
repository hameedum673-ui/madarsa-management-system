/**
 * مرحلہ 21 — نیا فلاحی اندراج کرنے کا صفحہ
 * فعال طلبہ کی فہرست دکھائی جاتی ہے۔ میز ابھی نہ بنی ہو (migration 015 نہ
 * چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import WelfareForm from "@/app/departments/welfare/WelfareForm";
import { addWelfare } from "@/app/departments/welfare/actions";
import { createClient } from "@/lib/supabase/server";
import type { Student } from "@/lib/students";

export default async function NewWelfarePage() {
  const supabase = await createClient();
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
          <BackButton href="/departments/welfare" />
          <h2>نیا فلاحی اندراج</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            طلبہ کی میز ابھی نہیں بنی — پہلے مرحلہ 4 کی SQL چلائیں۔
          </p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی فعال طالبہ درج نہیں ہے — پہلے طلبہ والے حصے میں طالبہ
            شامل کریں۔
          </p>
        ) : (
          <WelfareForm students={students} action={addWelfare} />
        )}
      </div>
    </div>
  );
}
