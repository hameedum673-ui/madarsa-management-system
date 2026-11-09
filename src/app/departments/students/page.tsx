/**
 * مرحلہ 4 — طلبہ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی طالبات نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 002 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
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

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  const students = (data ?? []) as Student[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <h2>طلبہ کا ریکارڈ</h2>
          <span className="page-count">
            کل: {students.length.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/students/new">
            + نئی طالبہ شامل کریں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            طلبہ کی میز ابھی نہیں بنی — پہلے مرحلہ 4 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی طالبہ درج نہیں ہے۔ اوپر والے بٹن سے پہلی طالبہ شامل کریں۔
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

        <Link className="back-btn" href="/">
          واپس مین ڈیش بورڈ
        </Link>
      </div>
    </div>
  );
}
