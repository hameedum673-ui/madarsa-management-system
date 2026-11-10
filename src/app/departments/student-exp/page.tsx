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
import type { Student } from "@/lib/students";
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
  searchParams: Promise<{ student?: string }>;
}) {
  const params = await searchParams;
  const selectedStudent = params.student ?? "all";

  const supabase = await createClient();
  const { data: studentsData } = await supabase
    .from("students")
    .select("*")
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  const students = (studentsData ?? []) as Student[];

  let query = supabase
    .from("student_expenses")
    .select("*, students(name, father_name, registration_number)")
    .order("expense_date", { ascending: false })
    .order("record_number", { ascending: false });
  if (selectedStudent !== "all") {
    query = query.eq("student_id", selectedStudent);
  }
  const { data, error } = await query;

  const records = (data ?? []) as StudentExpense[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const totalSpent = records
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const selectedStudentName =
    students.find((s) => s.id === selectedStudent)?.name ?? "";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
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

      </div>
    </div>
  );
}
