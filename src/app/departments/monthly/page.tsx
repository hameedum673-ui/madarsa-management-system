/**
 * مرحلہ 17 — ماہانہ حسابات (سرور صفحہ، صرف دیکھنے کے لیے)
 * کوئی نئی میز نہیں — خلاصہ فیس کی رسیدوں (fee_payments) اور اخراجات
 * (expenses) سے بنتا ہے۔ منسوخ رسید اور منسوخ خرچ خلاصے میں نہیں گنے جاتے۔
 * مہینہ چنیں، پھر "دکھائیں" دبائیں۔
 * مرحلہ 39 — پچھلے مہینے کا بقیہ + اختتامی بقیہ + مہینہ بند کرنا۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/fees";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from "@/lib/expenses";
import {
  DONATION_KINDS,
  DONATION_KIND_LABELS,
  type DonationKind,
} from "@/lib/donations";
import { getBalanceBefore, isMonthClosed } from "@/lib/monthClosing";
import { getMyMadrasa } from "@/lib/students";
import MonthClosingControls from "@/app/departments/monthly/MonthClosingControls";

/** "2026-11" کا اگلا مہینہ — "2026-12-01" */
function nextMonthStart(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return d.toISOString().slice(0, 7) + "-01";
}

export default async function MonthlyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const rawMonth = params.month ?? currentMonthInKarachi();
  const month = isValidMonth(rawMonth) ? rawMonth : currentMonthInKarachi();

  const supabase = await createClient();

  const { data: feesData, error: feesError } = await supabase
    .from("fee_payments")
    .select("amount, payment_method")
    .eq("fee_month", month)
    .eq("status", "active");
  const fees = (feesData ?? []) as { amount: number; payment_method: PaymentMethod }[];

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, category")
    .gte("expense_date", `${month}-01`)
    .lt("expense_date", nextMonthStart(month))
    .eq("status", "active");
  const expenses = (expensesData ?? []) as {
    amount: number;
    category: ExpenseCategory;
  }[];

  // مرحلہ 20 — عطیات بھی آمدنی ہیں (فیس کے ساتھ)
  const { data: donationsData, error: donationsError } = await supabase
    .from("donations")
    .select("amount, kind")
    .gte("donation_date", `${month}-01`)
    .lt("donation_date", nextMonthStart(month))
    .eq("status", "active");
  const donations = (donationsData ?? []) as {
    amount: number;
    kind: DonationKind;
  }[];

  const tableMissing =
    (feesError as { code?: string } | null)?.code === "42P01" ||
    (expensesError as { code?: string } | null)?.code === "42P01" ||
    (donationsError as { code?: string } | null)?.code === "42P01";

  // مرحلہ 39 — اس مہینے کی بندش + پچھلا بقیہ (میز نہ ہو تو کھلا مانا جاتا ہے)
  const mine = await getMyMadrasa(supabase);
  let monthClosed = false;
  let openingBalance = 0;
  if (mine) {
    monthClosed = await isMonthClosed(supabase, mine.madrasaId, month);
    openingBalance = await getBalanceBefore(supabase, month);
  }

  const feesTotal = fees.reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const donationsTotal = donations.reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0,
  );
  const incomeTotal = feesTotal + donationsTotal;
  const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const balance = incomeTotal - expensesTotal;

  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
  }
  const categoryRows = EXPENSE_CATEGORIES.filter(
    (c) => (byCategory.get(c) ?? 0) > 0,
  ).sort((a, b) => (byCategory.get(b) ?? 0) - (byCategory.get(a) ?? 0));

  const byMethod = new Map<PaymentMethod, number>();
  for (const f of fees) {
    byMethod.set(f.payment_method, (byMethod.get(f.payment_method) ?? 0) + f.amount);
  }
  const methodRows = PAYMENT_METHODS.filter(
    (m) => (byMethod.get(m) ?? 0) > 0,
  ).sort((a, b) => (byMethod.get(b) ?? 0) - (byMethod.get(a) ?? 0));

  const byKind = new Map<DonationKind, number>();
  for (const d of donations) {
    byKind.set(d.kind, (byKind.get(d.kind) ?? 0) + d.amount);
  }
  const kindRows = DONATION_KINDS.filter(
    (k) => (byKind.get(k) ?? 0) > 0,
  ).sort((a, b) => (byKind.get(b) ?? 0) - (byKind.get(a) ?? 0));

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>ماہانہ حسابات</h2>
          <span className="page-count">{formatMonthUrdu(month)}</span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">مہینہ</span>
            <input
              className="field-input"
              name="month"
              type="month"
              defaultValue={month}
            />
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            فیس یا اخراجات کی میز ابھی نہیں بنی — پہلے مرحلہ 8 اور مرحلہ 16 کی SQL
            چلائیں۔
          </p>
        ) : (
          <>
            <h3 className="form-section-title">مہینے کی بندش</h3>
            <div className="detail-rows">
              <div className="row">
                <span>مہینے کی حالت</span>
                <span>
                  <span
                    className={`badge${monthClosed ? " badge-withdrawn" : ""}`}
                  >
                    {monthClosed ? "بند ہے" : "کھلا ہے"}
                  </span>
                </span>
              </div>
            </div>
            <div className="form-actions">
              <MonthClosingControls month={month} isClosed={monthClosed} />
            </div>

            <h3 className="form-section-title">خلاصہ</h3>
            <div className="detail-rows">
              <div className="row">
                <span>پچھلے مہینے کا بقیہ</span>
                <span>{openingBalance.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>اس مہینے کی فیس</span>
                <span>
                  {feesTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {fees.length.toLocaleString("ur-PK")} رسیدیں
                </span>
              </div>
              <div className="row">
                <span>اس مہینے کے عطیات</span>
                <span>
                  {donationsTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {donations.length.toLocaleString("ur-PK")} عطیات
                </span>
              </div>
              <div className="row">
                <span>اس مہینے کی کل آمدنی</span>
                <span>{incomeTotal.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>اس مہینے کے اخراجات</span>
                <span>
                  {expensesTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {expenses.length.toLocaleString("ur-PK")} اخراجات
                </span>
              </div>
              <div className="row">
                <span>اس مہینے کا بیلنس</span>
                <span>{balance.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>اختتامی بقیہ</span>
                <span>
                  {(openingBalance + balance).toLocaleString("ur-PK")} روپے
                </span>
              </div>
            </div>

            <h3 className="form-section-title">اخراجات — زمرے کے حساب سے</h3>
            {categoryRows.length === 0 ? (
              <p className="empty-state">اس مہینے کا کوئی خرچ درج نہیں ہے۔</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>زمرہ</th>
                      <th>رقم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((c) => (
                      <tr key={c}>
                        <td>{EXPENSE_CATEGORY_LABELS[c]}</td>
                        <td>
                          {(byCategory.get(c) ?? 0).toLocaleString("ur-PK")} روپے
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">فیس — طریقے کے حساب سے</h3>
            {methodRows.length === 0 ? (
              <p className="empty-state">اس مہینے کی کوئی فیس درج نہیں ہے۔</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>طریقہ</th>
                      <th>رقم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodRows.map((m) => (
                      <tr key={m}>
                        <td>{PAYMENT_METHOD_LABELS[m]}</td>
                        <td>
                          {(byMethod.get(m) ?? 0).toLocaleString("ur-PK")} روپے
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">عطیات — قسم کے حساب سے</h3>
            {kindRows.length === 0 ? (
              <p className="empty-state">اس مہینے کا کوئی عطیہ درج نہیں ہے۔</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>قسم</th>
                      <th>رقم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kindRows.map((k) => (
                      <tr key={k}>
                        <td>{DONATION_KIND_LABELS[k]}</td>
                        <td>
                          {(byKind.get(k) ?? 0).toLocaleString("ur-PK")} روپے
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-actions">
              <Link
                className="btn-ghost"
                href={`/departments/income?month=${month}`}
              >
                آمدنی کی تفصیل دیکھیں
              </Link>
              <Link
                className="btn-ghost"
                href={`/departments/expenses?month=${month}`}
              >
                اخراجات کی تفصیل دیکھیں
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
