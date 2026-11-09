/**
 * مرحلہ 5 — اساتذہ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کے اساتذہ نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 003 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_LABELS, STUDENT_STATUS_LABELS } from "@/lib/students";
import type { Teacher } from "@/lib/teachers";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function TeachersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("created_at", { ascending: false });

  const teachers = (data ?? []) as Teacher[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>اساتذہ کا ریکارڈ</h2>
          <span className="page-count">
            کل: {teachers.length.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/teachers/new">
            + نیا استاد شامل کریں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            اساتذہ کی میز ابھی نہیں بنی — پہلے مرحلہ 5 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : teachers.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی استاد درج نہیں ہے۔ اوپر والے بٹن سے پہلا استاد شامل کریں۔
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
                  <th>عہدہ</th>
                  <th>تقرری</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/departments/teachers/${t.id}`}>
                        {t.name}
                      </Link>
                    </td>
                    <td>{t.father_name}</td>
                    <td dir="ltr">{t.phone ?? "—"}</td>
                    <td>{DEPARTMENT_LABELS[t.department]}</td>
                    <td>{t.position ?? "—"}</td>
                    <td>{formatDate(t.joining_date)}</td>
                    <td>
                      <span
                        className={`badge${t.status === "withdrawn" ? " badge-withdrawn" : ""}`}
                      >
                        {STUDENT_STATUS_LABELS[t.status]}
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
