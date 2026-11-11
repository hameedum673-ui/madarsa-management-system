/**
 * مرحلہ 8 — نئی فیس درج کرنے کا صفحہ (سرور صفحہ)
 * صرف فعال طالبات فارم میں آتی ہیں۔
 * میز ابھی نہ بنی ہو (migration 006 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import FeeForm, { type FeeStudent } from "@/app/departments/income/FeeForm";
import type { FeeScheduleEntry } from "@/lib/feeSchedule";

export default async function NewFeePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, father_name, registration_number, class_name, department")
    .eq("status", "active")
    .order("name", { ascending: true });

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const students = (data ?? []) as FeeStudent[];

  // مرحلہ 37 — طے شدہ فیس (میز نہ بنی ہو تو خالی — رقم ہاتھ سے لکھی جائے گی)
  let schedule: FeeScheduleEntry[] = [];
  try {
    const { data: scheduleData } = await supabase
      .from("fee_schedule")
      .select("department, class_name, amount")
      .eq("status", "active");
    schedule = (scheduleData ?? []) as FeeScheduleEntry[];
  } catch {
    schedule = [];
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income" />
          <h2>نئی فیس درج کریں</h2>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            فیس کی میز ابھی نہیں بنی — پہلے مرحلہ 8 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فارم نہیں کھل سکا — دوبارہ کوشش کریں۔</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            کوئی فعال طالبہ نہیں ہے — پہلے طلبہ کے ریکارڈ میں طالبہ شامل کریں۔
          </p>
        ) : (
          <FeeForm students={students} schedule={schedule} />
        )}

      </div>
    </div>
  );
}
