/**
 * درجہ وار حاضری کی رپورٹ (سرور صفحہ) — مہتمم کے لیے
 * صرف دیکھنے کے لیے ہے: اس صفحے سے حاضری نشان نہیں لگتی۔
 * اوپر پورے مدرسے کا خلاصہ (چنے ہوئے فلٹر کے مطابق)، پھر ہر جماعت
 * کا بلاک — گنتی + حاضر/غیر حاضر/رخصت/بیمار/باقی کے نام۔
 * "باقی" الگ دکھتا ہے تاکہ جس جماعت کی حاضری ابھی لگی ہی نہیں،
 * اس میں "حاضر 0" کو سب کی غیر حاضری نہ سمجھا جائے۔
 * صرف اپنے مدرسے کی فعال طالبات — RLS + شعبے کی اجازت۔
 */
import BackButton from "@/components/BackButton";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  buildClassAttendanceReport,
  isValidPastOrTodayDate,
  todayInKarachi,
  type AttendanceStatus,
  type ReportStudent,
} from "@/lib/attendance";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import ReportFilters from "@/app/departments/att-students/report/ReportFilters";
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

function namesList(students: ReportStudent[]): string {
  return students.map((s) => `${s.name} (${s.father_name})`).join("، ");
}

export default async function ClassAttendanceReportPage({
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

  let studentsQuery = supabase
    .from("students")
    .select("id, name, father_name, department, section, class_name")
    .eq("status", "active")
    .order("name", { ascending: true });
  if (department !== "all") {
    studentsQuery = studentsQuery.eq("department", department);
  }
  if (section !== "all") {
    studentsQuery = studentsQuery.eq("section", section);
  }
  if (allowedSections.size < 2) {
    studentsQuery = studentsQuery.eq(
      "section",
      [...allowedSections][0] ?? "__none__",
    );
  }
  const { data: studentsData, error: studentsError } = await studentsQuery;

  const { data: attData, error: attError } = await supabase
    .from("student_attendance")
    .select("student_id, status")
    .eq("date", date);

  const tableMissing =
    (studentsError as { code?: string } | null)?.code === "42P01" ||
    (attError as { code?: string } | null)?.code === "42P01";

  const students = (studentsData ?? []) as ReportStudent[];
  const existing: Record<string, AttendanceStatus> = {};
  for (const r of (attData ?? []) as {
    student_id: string;
    status: AttendanceStatus;
  }[]) {
    existing[r.student_id] = r.status;
  }
  const report = buildClassAttendanceReport(
    students,
    existing,
    t(lang, "att.report.no_class"),
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/att-students" />
          <h2>{t(lang, "att.report.title")}</h2>
          <span className="page-count">{formatDate(date)}</span>
        </div>

        <div className="print-only print-sheet-head">
          <h2>{t(lang, "att.report.title")}</h2>
          <p>{formatDate(date)}</p>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "att.table_missing.students")}
          </p>
        ) : studentsError || attError ? (
          <p className="empty-state">{t(lang, "att.load_error")}</p>
        ) : students.length === 0 ? (
          <p className="empty-state">{t(lang, "att.empty.students")}</p>
        ) : (
          <>
            <ReportFilters
              date={date}
              department={department}
              section={section}
              allowedSections={[...allowedSections]}
              lang={lang}
            />
            <div className="no-print" style={{ marginBottom: 12 }}>
              <PrintButton lang={lang} />
            </div>

            <h3 className="form-section-title">
              {t(lang, "att.report.total")}
              {" — "}
              {report.total.toLocaleString("ur-PK")}
            </h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "att.status.present")}</span>
                <span>{report.present.toLocaleString("ur-PK")}</span>
              </div>
              <div className="row">
                <span>{t(lang, "att.status.absent")}</span>
                <span>{report.absent.toLocaleString("ur-PK")}</span>
              </div>
              <div className="row">
                <span>{t(lang, "att.status.leave")}</span>
                <span>{report.leave.toLocaleString("ur-PK")}</span>
              </div>
              <div className="row">
                <span>{t(lang, "att.status.sick")}</span>
                <span>{report.sick.toLocaleString("ur-PK")}</span>
              </div>
              <div className="row">
                <span>{t(lang, "att.summary.remaining")}</span>
                <span>{report.unmarked.toLocaleString("ur-PK")}</span>
              </div>
            </div>

            {report.groups.map((g) => (
              <div
                key={g.className}
                className="page-card"
                style={{ marginTop: 16 }}
              >
                <h4 className="form-section-title">
                  {g.className}
                  {" — "}
                  {t(lang, "att.report.total")}
                  {" "}
                  {g.total.toLocaleString("ur-PK")}
                </h4>
                <div className="detail-rows">
                  <div className="row">
                    <span>{t(lang, "att.status.present")}</span>
                    <span>{g.present.length.toLocaleString("ur-PK")}</span>
                  </div>
                  <div className="row">
                    <span>{t(lang, "att.status.absent")}</span>
                    <span>{g.absent.length.toLocaleString("ur-PK")}</span>
                  </div>
                  <div className="row">
                    <span>{t(lang, "att.status.leave")}</span>
                    <span>{g.leave.length.toLocaleString("ur-PK")}</span>
                  </div>
                  <div className="row">
                    <span>{t(lang, "att.status.sick")}</span>
                    <span>{g.sick.length.toLocaleString("ur-PK")}</span>
                  </div>
                  <div className="row">
                    <span>{t(lang, "att.summary.remaining")}</span>
                    <span>{g.unmarked.length.toLocaleString("ur-PK")}</span>
                  </div>
                </div>
                {g.present.length > 0 ? (
                  <p style={{ marginTop: 10 }}>
                    <strong>{t(lang, "att.status.present")}: </strong>
                    {namesList(g.present)}
                  </p>
                ) : null}
                {g.absent.length > 0 ? (
                  <p>
                    <strong>{t(lang, "att.status.absent")}: </strong>
                    {namesList(g.absent)}
                  </p>
                ) : null}
                {g.leave.length > 0 ? (
                  <p>
                    <strong>{t(lang, "att.status.leave")}: </strong>
                    {namesList(g.leave)}
                  </p>
                ) : null}
                {g.sick.length > 0 ? (
                  <p>
                    <strong>{t(lang, "att.status.sick")}: </strong>
                    {namesList(g.sick)}
                  </p>
                ) : null}
                {g.unmarked.length > 0 ? (
                  <p>
                    <strong>{t(lang, "att.summary.remaining")}: </strong>
                    {namesList(g.unmarked)}
                  </p>
                ) : null}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
