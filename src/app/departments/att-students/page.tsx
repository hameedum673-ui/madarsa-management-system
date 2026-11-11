/**
 * مرحلہ 6 — طلبہ کی حاضری کا صفحہ (سرور صفحہ)
 * صرف اپنے مدرسے کی فعال طالبات نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 004 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  isValidPastOrTodayDate,
  todayInKarachi,
  type AttendanceStatus,
} from "@/lib/attendance";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import AttendanceForm, {
  type AttendanceStudent,
} from "@/app/departments/att-students/AttendanceForm";

function formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("ur-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; department?: string; section?: string }>;
}) {
  const sp = await searchParams;
  const date =
    sp.date && isValidPastOrTodayDate(sp.date) ? sp.date : todayInKarachi();
  const department =
    sp.department && DEPARTMENT_IDS.includes(sp.department as never)
      ? sp.department
      : "all";
  // مرحلہ 52 — شعبے کا فلٹر (پہلے سے "سب")
  const rawSection = sp.section ?? "all";
  const section: SectionId | "all" = (SECTION_IDS as string[]).includes(
    rawSection,
  )
    ? (rawSection as SectionId)
    : "all";

  const supabase = await createClient();

  let studentsQuery = supabase
    .from("students")
    .select("id, registration_number, name, father_name, department, section, class_name")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (department !== "all") {
    studentsQuery = studentsQuery.eq("department", department);
  }
  if (section !== "all") {
    studentsQuery = studentsQuery.eq("section", section);
  }
  const { data: studentsData, error: studentsError } = await studentsQuery;

  const { data: attData, error: attError } = await supabase
    .from("student_attendance")
    .select("student_id, status")
    .eq("date", date);

  const tableMissing =
    (studentsError as { code?: string } | null)?.code === "42P01" ||
    (attError as { code?: string } | null)?.code === "42P01";

  const students = (studentsData ?? []) as AttendanceStudent[];
  const existing: Record<string, AttendanceStatus> = {};
  for (const r of (attData ?? []) as {
    student_id: string;
    status: AttendanceStatus;
  }[]) {
    existing[r.student_id] = r.status;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>طلبہ کی حاضری</h2>
          <span className="page-count">{formatDate(date)}</span>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            حاضری کی میز ابھی نہیں بنی — پہلے مرحلہ 6 کی SQL چلائیں۔
          </p>
        ) : studentsError || attError ? (
          <p className="empty-state">حاضری نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : (
          <AttendanceForm
            students={students}
            existing={existing}
            date={date}
            department={department}
            section={section}
          />
        )}

      </div>
    </div>
  );
}
