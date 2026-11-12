/**
 * مرحلہ 22 — طلبہ کے اخراجات کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * کل اخراجات صرف فعال اندراجات کے ہیں — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * پہلے طالبہ چنیں، پھر «دکھائیں» دبائیں — «دکھائیں» صرف چنی ہوئی طالبہ کا
 * خرچ دکھاتا ہے، «سب» چنی ہو تو فہرست وہی رہتی ہے۔
 * میز ابھی نہ بنی ہو (migration 016 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  SECTION_IDS,
  SECTION_LABELS,
  type SectionId,
  type Student,
} from "@/lib/students";
import {
  STUDENT_EXPENSE_CATEGORY_LABELS,
  STUDENT_EXPENSE_STATUS_LABELS,
  type StudentExpense,
} from "@/lib/studentExpenses";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StudentExpPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; section?: string; page?: string }>;
}) {
  const params = await searchParams;
  const selectedStudent = params.student ?? "all";
  // مرحلہ 52 — شعبے کا فلٹر (پہلے سے "سب")
  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";


  // مرحلہ 59 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let studentsQuery = supabase
    .from("students")
    .select("*")
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  if (allowedSections.size < 2) {
    studentsQuery = studentsQuery.eq(
      "section",
      [...allowedSections][0] ?? "__none__",
    );
  }
  const { data: studentsData } = await studentsQuery;
  const students = (studentsData ?? []) as Student[];

  let query = supabase
    .from("student_expenses")
    .select("*, students(name, father_name, registration_number, section)", { count: "exact" })
    .order("expense_date", { ascending: false })
    .order("record_number", { ascending: false });
  if (selectedStudent !== "all") {
    query = query.eq("student_id", selectedStudent);
  }
  // مرحلہ 59 — شعبہ اب ڈیٹا بیس میں ہی فلٹر ہوتا ہے (ورنہ صفحہ غلط ہوتا)
  const sectionEq =
    section !== "all" && selectedStudent === "all"
      ? section
      : allowedSections.size < 2
        ? ([...allowedSections][0] ?? "__none__")
        : null;
  if (sectionEq) query = query.eq("students.section", sectionEq);
  query = query.range(from, to);
  const { data, error, count } = await query;

  // مرحلہ 59 — شعبہ اب اوپر ڈیٹا بیس میں ہی فلٹر ہوتا ہے
  const records = (data ?? []) as StudentExpense[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  // مرحلہ 59 — کل اخراجات — پوری فلٹر شدہ فہرست سے (صرف اس صفحے سے نہیں)
  let totalQuery = supabase
    .from("student_expenses")
    .select("amount, students(section)")
    .eq("status", "active");
  if (selectedStudent !== "all") {
    totalQuery = totalQuery.eq("student_id", selectedStudent);
  }
  if (sectionEq) totalQuery = totalQuery.eq("students.section", sectionEq);
  const { data: totalData } = await totalQuery;
  const totalSpent = (totalData ?? []).reduce(
    (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
    0,
  );
  const selectedStudentName =
    students.find((s) => s.id === selectedStudent)?.name ?? "";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/welfare-expenses" />
          <h2>طلبہ کے اخراجات</h2>
          <span className="page-count">
            کل اخراجات: {totalSpent.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/student-exp/new">
            + نیا اندراج
          </Link>
        </div>

        <form className="filter-row" method="get">
          <label className="field">
            <span className="field-label">طالبہ</span>
            <select
              className="field-input"
              name="student"
              defaultValue={selectedStudent}
            >
              <option value="all">سب</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.father_name}
                </option>
              ))}
            </select>
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
        </form>

        {selectedStudent !== "all" ? (
          <p className="sub">طالبہ: {selectedStudentName || "—"}</p>
        ) : null}

        {tableMissing ? (
          <p className="empty-state">
            طلبہ کے اخراجات کی میز ابھی نہیں بنی — پہلے مرحلہ 22 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : records.length === 0 ? (
          <p className="empty-state">ابھی کوئی خرچ درج نہیں ہے۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ریکارڈ نمبر</th>
                  <th>طالبہ</th>
                  <th>بنین / بنات</th>
                  <th>قسم</th>
                  <th>رقم</th>
                  <th>تاریخ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/departments/student-exp/${r.id}`}>
                        {r.record_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/student-exp/${r.id}`}>
                        {r.students?.name ?? "—"}
                      </Link>
                    </td>
                    <td>
                      {r.students?.section
                        ? SECTION_LABELS[r.students.section as SectionId]
                        : "—"}
                    </td>
                    <td>{STUDENT_EXPENSE_CATEGORY_LABELS[r.category]}</td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.expense_date)}</td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {STUDENT_EXPENSE_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={params} />

      </div>
    </div>
  );
}
