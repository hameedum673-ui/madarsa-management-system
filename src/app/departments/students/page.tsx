/**
 * مرحلہ 4 — طلبہ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی طالبات نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 002 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  DEPARTMENT_LABELS,
  STUDENT_STATUS_LABELS,
  type Student,
} from "@/lib/students";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  // مرحلہ 34 — تلاش: نام، والد کا نام، یا رجسٹریشن نمبر سے
  const q = (sp.q ?? "").trim();
  // تلاش کا لفظ صاف کریں تاکہ ڈیٹا بیس کی تلاش نہ ٹوٹے (%, _ اور , ہٹا دیں)
  const safeQ = q.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();

  const supabase = await createClient();
  let query = supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });
  if (safeQ) {
    query = query.or(
      `name.ilike.%${safeQ}%,father_name.ilike.%${safeQ}%,registration_number.ilike.%${safeQ}%`,
    );
  }
  const { data, error } = await query;

  const students = (data ?? []) as Student[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>طلبہ کا ریکارڈ</h2>
          <span className="page-count">
            {q
              ? `تلاش کا نتیجہ: ${students.length.toLocaleString("ur-PK")}`
              : `کل: ${students.length.toLocaleString("ur-PK")}`}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/students/new">
            + نئی طالبہ شامل کریں
          </Link>
        </div>

        <form
          method="get"
          action="/departments/students"
          className="att-controls"
        >
          <label className="field">
            <span className="field-label">تلاش کریں</span>
            <input
              className="field-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="نام، والد کا نام، یا رجسٹریشن نمبر"
            />
          </label>
          <button className="btn-primary" type="submit">
            تلاش کریں
          </button>
          {q ? (
            <Link className="btn-ghost" href="/departments/students">
              سب دکھائیں
            </Link>
          ) : null}
        </form>
        <p className="sub">
          پہلے خانے میں نام، والد کا نام، یا رجسٹریشن نمبر لکھیں، پھر
          &quot;تلاش کریں&quot; دبائیں۔
        </p>

        {tableMissing ? (
          <p className="empty-state">
            طلبہ کی میز ابھی نہیں بنی — پہلے مرحلہ 4 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            {q
              ? "اس تلاش سے کوئی طالبہ نہیں ملی — لفظ بدل کر دوبارہ تلاش کریں، یا سب دکھائیں۔"
              : "ابھی کوئی طالبہ درج نہیں ہے۔ اوپر والے بٹن سے پہلی طالبہ شامل کریں۔"}
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
                  <th>داخلہ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/students/${s.id}`}>
                        {s.registration_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/students/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td>{DEPARTMENT_LABELS[s.department]}</td>
                    <td>{s.class_name ?? "—"}</td>
                    <td>{formatDate(s.admission_date)}</td>
                    <td>
                      <span
                        className={`badge${s.status === "withdrawn" ? " badge-withdrawn" : ""}`}
                      >
                        {STUDENT_STATUS_LABELS[s.status]}
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
