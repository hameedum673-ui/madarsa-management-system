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
  DEPARTMENT_LABELS,
  SECTION_IDS,
  SECTION_LABELS,
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
  FEE_DUE_STATUS_LABELS,
  type FeeDueStatus,
  type FeeScheduleEntry,
  type FeeScheduleRow,
} from "@/lib/feeSchedule";
import ScheduleForm from "@/app/departments/income/schedule/ScheduleForm";
import DeactivateButton from "@/app/departments/income/schedule/DeactivateButton";
import {
  feeReminderMessage,
  getMadrasaNameForMessage,
  messagePhone,
  whatsappLink,
} from "@/lib/whatsapp";

function money(value: number): string {
  return `${value.toLocaleString("ur-PK")} روپے`;
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
          <h2>فیس کا شیڈول</h2>
          <span className="page-count">
            طے شدہ فیس: {schedule.length.toLocaleString("ur-PK")}
          </span>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            فیس کے شیڈول کی میز ابھی نہیں بنی — پہلے مرحلہ 37 کی SQL چلائیں۔
          </p>
        ) : scheduleError ? (
          <p className="empty-state">شیڈول نہیں کھل سکا — دوبارہ کوشش کریں۔</p>
        ) : (
          <>
            <h3 className="form-section-title">ماہانہ فیس طے کریں</h3>
            <ScheduleForm classes={classes} />

            <h3 className="form-section-title">طے شدہ فیس</h3>
            {schedule.length === 0 ? (
              <p className="empty-state">
                ابھی کوئی فیس طے نہیں ہے — اوپر والے فارم سے پہلی فیس طے کریں۔
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>شعبہ</th>
                      <th>جماعت</th>
                      <th>ماہانہ فیس</th>
                      <th>کارروائی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((s) => (
                      <tr key={s.id}>
                        <td>{DEPARTMENT_LABELS[s.department]}</td>
                        <td>{s.class_name === "" ? "پورا شعبہ" : s.class_name}</td>
                        <td>{money(s.amount)}</td>
                        <td>
                          <DeactivateButton id={s.id} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">ادا / بقایا فہرست</h3>
            <form
              method="get"
              action="/departments/income/schedule"
              className="att-controls"
            >
              <label className="field">
                <span className="field-label">مہینہ</span>
                <input
                  className="field-input"
                  type="month"
                  name="month"
                  defaultValue={month}
                />
              </label>
              <label className="field">
                <span className="field-label">شعبہ (بنین / بنات)</span>
                <select
                  className="field-input"
                  name="section"
                  defaultValue={section}
                >
                  <option value="all">سب</option>
                  {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                    <option key={s} value={s}>
                      {SECTION_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                دکھائیں
              </button>
              <span className="spacer" />
              <span className="page-count">
                {formatMonthUrdu(month)} — ادا شدہ:{" "}
                {counts.paid.toLocaleString("ur-PK")}، جزوی:{" "}
                {counts.partial.toLocaleString("ur-PK")}، بقایا:{" "}
                {counts.unpaid.toLocaleString("ur-PK")}، فیس طے نہیں:{" "}
                {counts.unset.toLocaleString("ur-PK")}
              </span>
            </form>
            <p className="sub">
              پہلے مہینہ چنیں، پھر &quot;دکھائیں&quot; دبائیں۔
            </p>

            {dueRows.length === 0 ? (
              <p className="empty-state">
                کوئی فعال طالبہ نہیں ہے — پہلے طلبہ کے ریکارڈ میں طالبہ شامل کریں۔
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>رجسٹریشن نمبر</th>
                      <th>نام</th>
                      <th>والد کا نام</th>
                      <th>شعبہ</th>
                      <th>جماعت</th>
                      <th>طے شدہ فیس</th>
                      <th>ادا شدہ</th>
                      <th>حالت</th>
                      <th>پیغام</th>
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
                            {DEPARTMENT_LABELS[r.student.department]}
                          </td>
                          <td>{r.student.class_name ?? "—"}</td>
                          <td>
                            {r.expected === null ? "—" : money(r.expected)}
                          </td>
                          <td>{money(r.paid)}</td>
                          <td>
                            <span className={statusBadgeClass(r.status)}>
                              {FEE_DUE_STATUS_LABELS[r.status]}
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
                                  WhatsApp پر بھیجیں
                                </a>
                              ) : (
                                "فون نمبر درج نہیں ہے"
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
