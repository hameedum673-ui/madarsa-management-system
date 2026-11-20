/**
 * عملے کی حاضری کا صفحہ (سرور صفحہ)
 * صرف اپنے مدرسے کا فعال عملہ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 062 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 * (اساتذہ والی حاضری جیسا ہی — صرف عملہ)
 */
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  isValidPastOrTodayDate,
  todayInKarachi,
  type AttendanceStatus,
} from "@/lib/attendance";
import { DEPARTMENT_IDS, SECTION_IDS, type SectionId } from "@/lib/students";
import StaffAttendanceForm, {
  type AttendanceStaff,
} from "@/app/departments/att-staff/StaffAttendanceForm";
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

export default async function StaffAttendancePage({
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
  const supabase = await createClient();
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

  let staffQuery = supabase
    .from("staff")
    .select("id, name, father_name, department, section, position")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (department !== "all") {
    staffQuery = staffQuery.eq("department", department);
  }
  if (section !== "all") {
    staffQuery = staffQuery.eq("section", section);
  }
  if (allowedSections.size < 2) {
    staffQuery = staffQuery.eq(
      "section",
      [...allowedSections][0] ?? "__none__",
    );
  }
  const { data: staffData, error: staffError } = await staffQuery;

  const { data: attData, error: attError } = await supabase
    .from("staff_attendance")
    .select("staff_id, status")
    .eq("date", date);

  const tableMissing =
    (staffError as { code?: string } | null)?.code === "42P01" ||
    (attError as { code?: string } | null)?.code === "42P01";

  const staff = (staffData ?? []) as AttendanceStaff[];
  const existing: Record<string, AttendanceStatus> = {};
  for (const r of (attData ?? []) as {
    staff_id: string;
    status: AttendanceStatus;
  }[]) {
    existing[r.staff_id] = r.status;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.att-staff")}</h2>
          <span className="page-count">{formatDate(date)}</span>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "att.table_missing.staff")}</p>
        ) : staffError || attError ? (
          <p className="empty-state">{t(lang, "att.load_error")}</p>
        ) : (
          <StaffAttendanceForm
            staff={staff}
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
