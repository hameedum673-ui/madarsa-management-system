/**
 * مرحلہ 19 — زکوٰۃ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * خلاصہ صرف فعال اندراجات کا ہے — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * زکوٰۃ کا پیسہ الگ فنڈ ہے — یہ ڈیش بورڈ کے بیلنس میں نہیں گنا جاتا۔
 * میز ابھی نہ بنی ہو (migration 013 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  ZAKAT_KINDS,
  ZAKAT_KIND_LABELS,
  ZAKAT_STATUS_LABELS,
  type ZakatKind,
  type ZakatRecord,
} from "@/lib/zakat";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ZakatPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const rawKind = params.kind ?? "all";
  const kind: ZakatKind | "all" = (ZAKAT_KINDS as string[]).includes(rawKind)
    ? (rawKind as ZakatKind)
    : "all";

  const supabase = await createClient();
  let query = supabase
    .from("zakat_records")
    .select("*")
    .order("record_date", { ascending: false })
    .order("receipt_number", { ascending: false });
  if (kind !== "all") query = query.eq("kind", kind);
  const { data, error } = await query;

  const records = (data ?? []) as ZakatRecord[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const active = records.filter((r) => r.status === "active");
  const totalReceived = active
    .filter((r) => r.kind === "received")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const totalDistributed = active
    .filter((r) => r.kind === "distributed")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const remaining = totalReceived - totalDistributed;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>زکوٰۃ کا حساب</h2>
          <span className="page-count">
            باقی: {remaining.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/zakat/new">
            + نیا اندراج
          </Link>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>کل وصول شدہ زکوٰۃ</span>
            <span>{totalReceived.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>کل تقسیم شدہ زکوٰۃ</span>
            <span>{totalDistributed.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>باقی زکوٰۃ</span>
            <span>{remaining.toLocaleString("ur-PK")} روپے</span>
          </div>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">قسم</span>
            <select className="field-input" name="kind" defaultValue={kind}>
              <option value="all">سب</option>
              {ZAKAT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {ZAKAT_KIND_LABELS[k]}
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
            زکوٰۃ کی میز ابھی نہیں بنی — پہلے مرحلہ 19 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : records.length === 0 ? (
          <p className="empty-state">ابھی کوئی زکوٰۃ اندراج درج نہیں ہے۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>قسم</th>
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
                      <Link href={`/departments/zakat/${r.id}`}>
                        {r.receipt_number}
                      </Link>
                    </td>
                    <td>{ZAKAT_KIND_LABELS[r.kind]}</td>
                    <td>
                      <Link href={`/departments/zakat/${r.id}`}>
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
                        {ZAKAT_STATUS_LABELS[r.status]}
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
