/**
 * مرحلہ 48 — عشر کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * خلاصہ صرف فعال اندراجات کا ہے — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * وکالت کا اصول: عشر آمدنی میں شامل ہے اور ڈیش بورڈ کے بیلنس میں گنا
 * جاتا ہے (صرف وصولی)۔
 * میز ابھی نہ بنی ہو (migration 027 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  USHR_STATUS_LABELS,
  type UshrRecord,
} from "@/lib/ushr";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function UshrPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ushr_records")
    .select("*")
    .order("record_date", { ascending: false })
    .order("receipt_number", { ascending: false });

  const records = (data ?? []) as UshrRecord[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const active = records.filter((r) => r.status === "active");
  // مرحلہ 49 — تقسیم ختم: صرف "وصولی" والے اندراج گنے جاتے ہیں —
  // پرانے تقسیم والے اندراج (اگر کوئی ہوں) یہاں نہیں گنے جاتے
  const totalReceived = active
    .filter((r) => r.kind === "received")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income" />
          <h2>عشر کا حساب</h2>
          <span className="page-count">
            کل وصول شدہ: {totalReceived.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/ushr/new">
            + نیا اندراج
          </Link>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>کل وصول شدہ عشر</span>
            <span>{totalReceived.toLocaleString("ur-PK")} روپے</span>
          </div>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            عشر کی میز ابھی نہیں بنی — پہلے مرحلہ 48 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : records.length === 0 ? (
          <p className="empty-state">ابھی کوئی عشر اندراج درج نہیں ہے۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>نام</th>
                  <th>رقم</th>
                  <th>تاریخ</th>
                  <th>طریقہ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/departments/ushr/${r.id}`}>
                        {r.receipt_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/ushr/${r.id}`}>
                        {r.person_name}
                      </Link>
                    </td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.record_date)}</td>
                    <td>{PAYMENT_METHOD_LABELS[r.payment_method]}</td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {USHR_STATUS_LABELS[r.status]}
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
