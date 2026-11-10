/**
 * مرحلہ 21 — فلاحی کام کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * کل معاونت صرف فعال اندراجات کی ہے — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * میز ابھی نہ بنی ہو (migration 015 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  WELFARE_KIND_LABELS,
  WELFARE_STATUS_LABELS,
  type WelfareRecord,
} from "@/lib/welfare";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function WelfarePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("welfare_records")
    .select("*, students(name, father_name, registration_number)")
    .order("record_date", { ascending: false })
    .order("record_number", { ascending: false });

  const records = (data ?? []) as WelfareRecord[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const totalAid = records
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>فلاحی کام</h2>
          <span className="page-count">
            کل معاونت: {totalAid.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/welfare/new">
            + نیا اندراج
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            فلاحی کام کی میز ابھی نہیں بنی — پہلے مرحلہ 21 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : records.length === 0 ? (
          <p className="empty-state">ابھی کوئی معاونت درج نہیں ہے۔</p>
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
                      <Link href={`/departments/welfare/${r.id}`}>
                        {r.record_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/welfare/${r.id}`}>
                        {r.students?.name ?? "—"}
                      </Link>
                    </td>
                    <td>{WELFARE_KIND_LABELS[r.kind]}</td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.record_date)}</td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {WELFARE_STATUS_LABELS[r.status]}
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
