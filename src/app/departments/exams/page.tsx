/**
 * مرحلہ 10 — امتحانات کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کے امتحان نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 008 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_LABELS } from "@/lib/students";
import type { Exam } from "@/lib/exams";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ExamsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .order("exam_date", { ascending: false });

  const exams = (data ?? []) as Exam[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>امتحانات اور نتائج</h2>
          <span className="page-count">
            کل: {exams.length.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/exams/new">
            + نیا امتحان بنائیں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            امتحانات کی میز ابھی نہیں بنی — پہلے مرحلہ 10 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : exams.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی امتحان نہیں بنایا گیا۔ اوپر والے بٹن سے پہلا امتحان بنائیں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>امتحان</th>
                  <th>تاریخ</th>
                  <th>شعبہ</th>
                  <th>جماعت</th>
                  <th>مضامین</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.id}>
                    <td>
                      <Link href={`/departments/exams/${ex.id}`}>
                        {ex.name}
                      </Link>
                    </td>
                    <td>{formatDate(ex.exam_date)}</td>
                    <td>{DEPARTMENT_LABELS[ex.department]}</td>
                    <td>{ex.class_name ?? "—"}</td>
                    <td>{(ex.subjects ?? []).join("، ") || "—"}</td>
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
