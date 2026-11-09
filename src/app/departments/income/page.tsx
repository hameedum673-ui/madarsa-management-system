/**
 * مرحلہ 8 — آمدنی کا ریکارڈ: فیس اور رسیدوں کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی فیس نظر آتی ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 006 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 * کل رقم صرف فعال رسیدوں کی ہوتی ہے — منسوخ شدہ شامل نہیں ہوتی۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  FEE_PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
  type FeePayment,
} from "@/lib/fees";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const month =
    sp.month === "all"
      ? "all"
      : sp.month && isValidMonth(sp.month)
        ? sp.month
        : currentMonthInKarachi();

  const supabase = await createClient();

  let query = supabase
    .from("fee_payments")
    .select("*, students(name, father_name)")
    .order("created_at", { ascending: false });
  if (month !== "all") {
    query = query.eq("fee_month", month);
  }
  const { data, error } = await query;

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  const payments = (data ?? []) as (FeePayment & {
    students: { name: string; father_name: string } | null;
  })[];
  const totalCollected = payments
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>آمدنی کا ریکارڈ — فیس اور رسیدیں</h2>
          <span className="page-count">
            {month === "all"
              ? "سب مہینے"
              : formatMonthUrdu(month)}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/income/new">
            + نئی فیس درج کریں
          </Link>
        </div>

        <form
          method="get"
          action="/departments/income"
          className="att-controls"
        >
          <label className="field">
            <span className="field-label">مہینہ</span>
            <input
              className="field-input"
              type="month"
              name="month"
              defaultValue={month === "all" ? "" : month}
            />
          </label>
          <button className="btn-primary" type="submit">
            دیکھیں
          </button>
          <Link className="btn-ghost" href="/departments/income?month=all">
            سب مہینے دیکھیں
          </Link>
          <span className="spacer" />
          <span className="page-count">
            کل وصول شدہ: {totalCollected.toLocaleString("ur-PK")} روپے
          </span>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            فیس کی میز ابھی نہیں بنی — پہلے مرحلہ 8 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : payments.length === 0 ? (
          <p className="empty-state">
            اس مہینے کی کوئی فیس درج نہیں ہے۔ اوپر والے بٹن سے پہلی فیس درج کریں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>طالبہ</th>
                  <th>مہینہ</th>
                  <th>رقم (روپے)</th>
                  <th>طریقہ</th>
                  <th>تاریخ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/departments/income/${p.id}`}>
                        {p.receipt_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/income/${p.id}`}>
                        {p.students?.name ?? "—"}
                      </Link>
                    </td>
                    <td>{formatMonthUrdu(p.fee_month)}</td>
                    <td>{p.amount.toLocaleString("ur-PK")}</td>
                    <td>{PAYMENT_METHOD_LABELS[p.payment_method]}</td>
                    <td>{formatDate(p.payment_date)}</td>
                    <td>
                      <span
                        className={`badge ${p.status === "voided" ? "badge-muted" : ""}`}
                      >
                        {FEE_PAYMENT_STATUS_LABELS[p.status]}
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
