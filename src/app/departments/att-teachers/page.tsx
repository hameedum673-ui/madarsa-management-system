/**
 * مرحلہ 7 — اساتذہ کی حاضری کا صفحہ (سرور صفحہ)
 * صرف اپنے مدرسے کے فعال اساتذہ نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 005 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  isValidPastOrTodayDate,
  todayInKarachi,
  type AttendanceStatus,
} from "@/lib/attendance";
import { DEPARTMENT_IDS } from "@/lib/students";
import TeacherAttendanceForm, {
  type AttendanceTeacher,
} from "@/app/departments/att-teachers/TeacherAttendanceForm";

function formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("ur-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; department?: string }>;
}) {
  const sp = await searchParams;
  const date =
    sp.date && isValidPastOrTodayDate(sp.date) ? sp.date : todayInKarachi();
  const department =
    sp.department && DEPARTMENT_IDS.includes(sp.department as never)
      ? sp.department
      : "all";

  const supabase = await createClient();

  let teachersQuery = supabase
    .from("teachers")
    .select("id, name, father_name, department, position")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (department !== "all") {
    teachersQuery = teachersQuery.eq("department", department);
  }
  const { data: teachersData, error: teachersError } = await teachersQuery;

  const { data: attData, error: attError } = await supabase
    .from("teacher_attendance")
    .select("teacher_id, status")
    .eq("date", date);

  const tableMissing =
    (teachersError as { code?: string } | null)?.code === "42P01" ||
    (attError as { code?: string } | null)?.code === "42P01";

  const teachers = (teachersData ?? []) as AttendanceTeacher[];
  const existing: Record<string, AttendanceStatus> = {};
  for (const r of (attData ?? []) as {
    teacher_id: string;
    status: AttendanceStatus;
  }[]) {
    existing[r.teacher_id] = r.status;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <h2>اساتذہ کی حاضری</h2>
          <span className="page-count">{formatDate(date)}</span>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            حاضری کی میز ابھی نہیں بنی — پہلے مرحلہ 7 کی SQL چلائیں۔
          </p>
        ) : teachersError || attError ? (
          <p className="empty-state">حاضری نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : (
          <TeacherAttendanceForm
            teachers={teachers}
            existing={existing}
            date={date}
            department={department}
          />
        )}

        <Link className="back-btn" href="/">
          واپس مین ڈیش بورڈ
        </Link>
      </div>
    </div>
  );
}
