/**
 * مرحلہ 20 — صدقات اور عطیات کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * کل عطیات صرف فعال اندراجات کے ہیں — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * میز ابھی نہ بنی ہو (migration 014 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  DONATION_KINDS,
  DONATION_KIND_LABELS,
  DONATION_STATUS_LABELS,
  type Donation,
  type DonationKind,
} from "@/lib/donations";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const params = await searchParams;
  const rawKind = params.kind ?? "all";
  const kind: DonationKind | "all" = (DONATION_KINDS as string[]).includes(
    rawKind,
  )
    ? (rawKind as DonationKind)
    : "all";

  const supabase = await createClient();
  let query = supabase
    .from("donations")
    .select("*")
    .order("donation_date", { ascending: false })
    .order("receipt_number", { ascending: false });
  if (kind !== "all") query = query.eq("kind", kind);
  const { data, error } = await query;

  const donations = (data ?? []) as Donation[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const totalDonations = donations
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>صدقات اور عطیات</h2>
          <span className="page-count">
            کل: {totalDonations.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/donations/new">
            + نیا عطیہ
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">قسم</span>
            <select className="field-input" name="kind" defaultValue={kind}>
              <option value="all">سب</option>
              {DONATION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {DONATION_KIND_LABELS[k]}
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
            عطیات کی میز ابھی نہیں بنی — پہلے مرحلہ 20 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : donations.length === 0 ? (
          <p className="empty-state">ابھی کوئی عطیہ درج نہیں ہے۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>قسم</th>
                  <th>عطیہ دینے والا</th>
                  <th>رقم</th>
                  <th>تاریخ</th>
                  <th>طریقہ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/departments/donations/${d.id}`}>
                        {d.receipt_number}
                      </Link>
                    </td>
                    <td>{DONATION_KIND_LABELS[d.kind]}</td>
                    <td>
                      <Link href={`/departments/donations/${d.id}`}>
                        {d.donor_name}
                      </Link>
                    </td>
                    <td>{d.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(d.donation_date)}</td>
                    <td>{PAYMENT_METHOD_LABELS[d.payment_method]}</td>
                    <td>
                      <span
                        className={`badge${d.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {DONATION_STATUS_LABELS[d.status]}
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
