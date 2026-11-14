/**
 * مرحلہ 7 — اساتذہ کی حاضری کا صفحہ (سرور صفحہ)
 * صرف اپنے مدرسے کے فعال اساتذہ نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 005 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
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
import TeacherAttendanceForm, {
  type AttendanceTeacher,
} from "@/app/departments/att-teachers/TeacherAttendanceForm";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

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
  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const [allowedSections, lang] = await Promise.all([
    getMyAllowedSections(supabase),
    getMyLanguage(),
  ]);
  const rawSection = sp.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";


  let teachersQuery = supabase
    .from("teachers")
    .select("id, name, father_name, department, section, position")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (department !== "all") {
    teachersQuery = teachersQuery.eq("department", department);
  }
  if (section !== "all") {
    teachersQuery = teachersQuery.eq("section", section);
  }
  if (allowedSections.size < 2) {
    teachersQuery = teachersQuery.eq(
      "section",
      [...allowedSections][0] ?? "__none__",
    );
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
          <BackButton />
          <h2>{t(lang, "module.att-teachers")}</h2>
          <span className="page-count">{formatDate(date)}</span>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "att.table_missing.teachers")}
          </p>
        ) : teachersError || attError ? (
          <p className="empty-state">{t(lang, "att.load_error")}</p>
        ) : (
          <TeacherAttendanceForm
            teachers={teachers}
            existing={existing}
            date={date}
            department={department}
            section={section}
            allowedSections={[...allowedSections]}
            lang={lang}
          />
        )}

      </div>
    </div>
  );
}
