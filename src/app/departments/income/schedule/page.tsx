/**
 * مرحلہ 37 — فیس کا شیڈول: فیس طے کرنا + ادا / بقایا فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی فیس اور طالبات نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 022 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 * قسطوں کو جوڑ کر دیکھا جاتا ہے — پوری رقم دی ہو تو ادا شدہ، کچھ دی ہو تو جزوی۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  getMySectionFilter,
} from "@/lib/permissions";
import {
  SECTION_IDS,
  type DepartmentId,
  type SectionId,
  type Student,
} from "@/lib/students";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
} from "@/lib/fees";
import { getActiveClasses } from "@/lib/classes";
import {
  dueStatus,
  feeForStudent,
  type FeeDueStatus,
  type FeeScheduleEntry,
  type FeeScheduleRow,
} from "@/lib/feeSchedule";
import { getMyLanguage } from "@/lib/language";
import { t, type Lang } from "@/i18n/dictionary";
import ScheduleForm from "@/app/departments/income/schedule/ScheduleForm";
import DeactivateButton from "@/app/departments/income/schedule/DeactivateButton";
import {
  feeReminderMessage,
  getMadrasaNameForMessage,
  messagePhone,
  whatsappLink,
} from "@/lib/whatsapp";

function money(value: number, lang: Lang): string {
  return t(lang, "common.money", { n: value.toLocaleString("ur-PK") });
}

function statusBadgeClass(status: FeeDueStatus): string {
  if (status === "paid") return "badge";
  if (status === "partial") return "badge badge-partial";
  if (status === "unpaid") return "badge badge-withdrawn";
  return "badge badge-muted";
}

export default async function FeeSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; section?: string }>;
}) {
  const sp = await searchParams;
  const month =
    sp.month && isValidMonth(sp.month)
      ? sp.month
      : currentMonthInKarachi();

  const supabase = await createClient();
  const lang = await getMyLanguage();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  // مرحلہ 55 — چنا ہوا شعبہ (بنین / بنات / سب)
  const section = getMySectionFilter(allowedSections, sp.section);
  const effectiveSections =
    section === "all" ? allowedSections : new Set<SectionId>([section]);

  const { data: scheduleData, error: scheduleError } = await supabase
    .from("fee_schedule")
    .select("id, department, class_name, amount")
    .eq("status", "active")
    .order("department", { ascending: true })
    .order("class_name", { ascending: true });

  const tableMissing =
    (scheduleError as { code?: string } | null)?.code === "42P01";

  const schedule = (scheduleData ?? []) as FeeScheduleRow[];
  const scheduleEntries: FeeScheduleEntry[] = schedule.map((s) => ({
    department: s.department,
    class_name: s.class_name,
    amount: s.amount,
  }));

  const classes = await getActiveClasses(supabase);

  let scheduleStudentsQuery = supabase
    .from("students")
    .select(
      "id, name, father_name, registration_number, department, class_name, guardian_phone, whatsapp_number",
    )
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  if (allowedSections.size < 2) {
    scheduleStudentsQuery = scheduleStudentsQuery.eq(
      "section",
      [...allowedSections][0] ?? "__none__",
    );
  }
  // مرحلہ 55 — چنا ہوا شعبہ ہو تو صرف وہی شعبہ
  if (section !== "all") {
    scheduleStudentsQuery = scheduleStudentsQuery.eq("section", section);
  }
  const { data: studentsData } = await scheduleStudentsQuery;
  const students = (studentsData ?? []) as Pick<
    Student,
    | "id"
    | "name"
    | "father_name"
    | "registration_number"
    | "department"
    | "class_name"
    | "guardian_phone"
    | "whatsapp_number"
  >[];

  const madrasaName = await getMadrasaNameForMessage(supabase);

  const { data: paymentsData } = await supabase
    .from("fee_payments")
    .select("student_id, amount")
    .eq("fee_month", month)
    .eq("status", "active");
  const paidByStudent = new Map<string, number>();
  for (const p of (paymentsData ?? []) as {
    student_id: string;
    amount: number;
  }[]) {
    paidByStudent.set(
      p.student_id,
      (paidByStudent.get(p.student_id) ?? 0) + p.amount,
    );
  }

  const dueRows = students.map((s) => {
    const expected = feeForStudent(
      scheduleEntries,
      s.department as DepartmentId,
      s.class_name,
    );
    const paid = paidByStudent.get(s.id) ?? 0;
    return { student: s, expected, paid, status: dueStatus(expected, paid) };
  });
  const counts = {
    paid: dueRows.filter((r) => r.status === "paid").length,
    partial: dueRows.filter((r) => r.status === "partial").length,
    unpaid: dueRows.filter((r) => r.status === "unpaid").length,
    unset: dueRows.filter((r) => r.status === "unset").length,
  };

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income/fees" />
          <h2>{t(lang, "schedule.title")}</h2>
          <span className="page-count">
            {t(lang, "schedule.count_set", {
              n: schedule.length.toLocaleString("ur-PK"),
            })}
          </span>
        </div>

        {tableMissing ? (
          <p className="empty-state">
{t(lang, "schedule.table_missing")}
          </p>
        ) : scheduleError ? (
<p className="empty-state">{t(lang, "schedule.load_error")}</p>
        ) : (
          <>
            <h3 className="form-section-title">{t(lang, "schedule.set_title")}</h3>
            <ScheduleForm classes={classes} lang={lang} />

            <h3 className="form-section-title">{t(lang, "schedule.set_list_title")}</h3>
            {schedule.length === 0 ? (
              <p className="empty-state">
{t(lang, "schedule.empty")}
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.dept")}</th>
                      <th>{t(lang, "col.class")}</th>
                      <th>{t(lang, "schedule.col_monthly")}</th>
                      <th>{t(lang, "col.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s) => (
                      <tr key={s.id}>
                        <td>{t(lang, `dept.${s.department}`)}</td>
                        <td>{s.class_name === "" ? t(lang, "schedule.whole_dept") : s.class_name}</td>
                        <td>{money(s.amount, lang)}</td>
                        <td>
                          <DeactivateButton id={s.id} lang={lang} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">{t(lang, "schedule.due_title")}</h3>
            <form
              method="get"
              action="/departments/income/schedule"
              className="att-controls"
            >
              <label className="field">
                <span className="field-label">{t(lang, "fees.month")}</span>
                <input
                  className="field-input"
                  type="month"
                  name="month"
                  defaultValue={month}
                />
              </label>
              <label className="field">
                <span className="field-label">{t(lang, "students.section_filter")}</span>
                <select
                  className="field-input"
                  name="section"
                  defaultValue={section}
                >
                  <option value="all">{t(lang, "common.all")}</option>
                  {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                    <option key={s} value={s}>
    {t(lang, `section.${s}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                {t(lang, "common.show")}
              </button>
              <span className="spacer" />
              <span className="page-count">
                {t(lang, "schedule.counts_line", {
                  month: formatMonthUrdu(month),
                  paid: counts.paid.toLocaleString("ur-PK"),
                  partial: counts.partial.toLocaleString("ur-PK"),
                  unpaid: counts.unpaid.toLocaleString("ur-PK"),
                  unset: counts.unset.toLocaleString("ur-PK"),
                })}
              </span>
            </form>
            <p className="sub">
{t(lang, "schedule.hint")}
            </p>

            {dueRows.length === 0 ? (
              <p className="empty-state">
{t(lang, "fees.no_students")}
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.reg")}</th>
                      <th>{t(lang, "col.name")}</th>
                      <th>{t(lang, "col.father")}</th>
                      <th>{t(lang, "col.dept")}</th>
                      <th>{t(lang, "col.class")}</th>
                      <th>{t(lang, "schedule.col_expected")}</th>
                      <th>{t(lang, "schedule.col_paid")}</th>
                      <th>{t(lang, "col.status")}</th>
                      <th>{t(lang, "schedule.col_message")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueRows.map((r) => {
                      // مرحلہ 44 — بقایا / جزوی فیس کی WhatsApp یاد دہانی
                      const reminderLink =
                        (r.status === "unpaid" || r.status === "partial") &&
                        r.expected !== null
                          ? whatsappLink(
                              messagePhone(
                                r.student.guardian_phone,
                                r.student.whatsapp_number,
                              ),
                              feeReminderMessage({
                                madrasaName,
                                studentName: r.student.name,
                                monthUrdu: formatMonthUrdu(month),
                                expected: r.expected,
                                paid: r.paid,
                              }),
                            )
                          : null;
                      return (
                        <tr key={r.student.id}>
                          <td>
                            <Link
                              href={`/departments/students/${r.student.id}`}
                            >
                              {r.student.registration_number}
                            </Link>
                          </td>
                          <td>
                            <Link
                              href={`/departments/students/${r.student.id}`}
                            >
                              {r.student.name}
                            </Link>
                          </td>
                          <td>{r.student.father_name}</td>
                          <td>
                            {t(lang, `dept.${r.student.department}`)}
                          </td>
                          <td>{r.student.class_name ?? "—"}</td>
                          <td>
{r.expected === null ? "—" : money(r.expected, lang)}
                          </td>
                          <td>{money(r.paid, lang)}</td>
                          <td>
                            <span className={statusBadgeClass(r.status)}>
{t(lang, `schedule.due.${r.status}`)}
                            </span>
                          </td>
                          <td>
                            {r.status === "unpaid" ||
                            r.status === "partial" ? (
                              reminderLink ? (
                                <a
                                  className="btn-ghost"
                                  href={reminderLink}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {t(lang, "schedule.whatsapp_send")}
                                </a>
                              ) : (
                                t(lang, "schedule.no_phone")
                              )
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
