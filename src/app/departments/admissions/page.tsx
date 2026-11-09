/**
 * مرحلہ 9 — نئے داخلوں کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی درخواستیں نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 007 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  ADMISSION_STATUS_IDS,
  ADMISSION_STATUS_LABELS,
  type Admission,
  type AdmissionStatus,
} from "@/lib/admissions";
import { DEPARTMENT_LABELS } from "@/lib/students";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const rawStatus = params.status ?? "all";
  const status: AdmissionStatus | "all" = (
    ADMISSION_STATUS_IDS as string[]
  ).includes(rawStatus)
    ? (rawStatus as AdmissionStatus)
    : "all";

  const supabase = await createClient();
  let query = supabase
    .from("admissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  const { data, error } = await query;

  const admissions = (data ?? []) as Admission[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  // حالت کے حساب سے گنتی (فلٹر سے آزاد — فہرست کے اوپر خلاصہ)
  const { data: allData } = await supabase
    .from("admissions")
    .select("status");
  const counts = { all: 0, pending: 0, approved: 0, rejected: 0 };
  for (const row of (allData ?? []) as { status: AdmissionStatus }[]) {
    counts.all += 1;
    counts[row.status] += 1;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>نئے داخلے</h2>
          <span className="page-count">
            کل: {counts.all.toLocaleString("ur-PK")} — زیرِ غور:{" "}
            {counts.pending.toLocaleString("ur-PK")} — منظور:{" "}
            {counts.approved.toLocaleString("ur-PK")} — مسترد:{" "}
            {counts.rejected.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/admissions/new">
            + نئی درخواست درج کریں
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="att-field">
            <span className="att-label">حالت</span>
            <select
              className="att-input"
              name="status"
              defaultValue={status}
            >
              <option value="all">سب</option>
              {ADMISSION_STATUS_IDS.map((s) => (
                <option key={s} value={s}>
                  {ADMISSION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            داخلوں کی میز ابھی نہیں بنی — پہلے مرحلہ 9 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : admissions.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی درخواست درج نہیں ہے۔ اوپر والے بٹن سے پہلی درخواست درج کریں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>والد کا نام</th>
                  <th>شعبہ</th>
                  <th>جماعت</th>
                  <th>درخواست کی تاریخ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {admissions.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/departments/admissions/${a.id}`}>
                        {a.applicant_name}
                      </Link>
                    </td>
                    <td>{a.father_name}</td>
                    <td>{DEPARTMENT_LABELS[a.department]}</td>
                    <td>{a.class_name ?? "—"}</td>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <span
                        className={`badge${a.status === "rejected" ? " badge-withdrawn" : ""}`}
                      >
                        {ADMISSION_STATUS_LABELS[a.status]}
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
