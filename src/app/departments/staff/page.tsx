/**
 * مرحلہ 13 — عملے کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا عملہ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 010 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_LABELS, STUDENT_STATUS_LABELS } from "@/lib/students";
import type { StaffMember } from "@/lib/staff";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StaffPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("created_at", { ascending: false });

  const staff = (data ?? []) as StaffMember[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>عملے کا ریکارڈ</h2>
          <span className="page-count">
            کل: {staff.length.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/staff/new">
            + نیا عملہ شامل کریں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            عملے کی میز ابھی نہیں بنی — پہلے مرحلہ 13 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : staff.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی عملہ درج نہیں ہے۔ اوپر والے بٹن سے پہلا عملہ شامل کریں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>والد کا نام</th>
                  <th>فون</th>
                  <th>شعبہ</th>
                  <th>عہدہ / کام</th>
                  <th>تقرری</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/staff/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td dir="ltr">{s.phone ?? "—"}</td>
                    <td>{DEPARTMENT_LABELS[s.department]}</td>
                    <td>{s.position ?? "—"}</td>
                    <td>{formatDate(s.joining_date)}</td>
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
