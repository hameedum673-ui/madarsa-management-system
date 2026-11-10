/**
 * مرحلہ 18 — سالانہ حسابات (سرور صفحہ، صرف دیکھنے کے لیے)
 * کوئی نئی میز نہیں — خلاصہ فیس کی رسیدوں (fee_payments) اور اخراجات
 * (expenses) سے بنتا ہے۔ منسوخ رسید اور منسوخ خرچ خلاصے میں نہیں گنے جاتے۔
 * سال چنیں (عیسوی سال)، پھر "دکھائیں" دبائیں۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  formatMonthUrdu,
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

/** پاکستان کے وقت کے مطابق موجودہ عیسوی سال */
function currentYearInKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
  }).format(new Date());
}

function isValidYear(value: string): boolean {
  if (!/^\d{4}$/.test(value)) return false;
  const y = Number(value);
  return y >= 2000 && y <= 2100;
}

const MONTHS = [
  "01", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "11", "12",
];

export default async function YearlyPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const rawYear = params.year ?? currentYearInKarachi();
  const year = isValidYear(rawYear) ? rawYear : currentYearInKarachi();

  const supabase = await createClient();

  const { data: feesData, error: feesError } = await supabase
    .from("fee_payments")
    .select("amount, payment_method, fee_month")
    .like("fee_month", `${year}-%`)
    .eq("status", "active");
  const fees = (feesData ?? []) as {
    amount: number;
    payment_method: PaymentMethod;
    fee_month: string;
  }[];

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, category, expense_date")
    .gte("expense_date", `${year}-01-01`)
    .lt("expense_date", `${Number(year) + 1}-01-01`)
    .eq("status", "active");
  const expenses = (expensesData ?? []) as {
    amount: number;
    category: ExpenseCategory;
    expense_date: string;
  }[];

  // مرحلہ 20 — عطیات بھی آمدنی ہیں (فیس کے ساتھ)
  const { data: donationsData, error: donationsError } = await supabase
    .from("donations")
    .select("amount, kind, donation_date")
    .gte("donation_date", `${year}-01-01`)
    .lt("donation_date", `${Number(year) + 1}-01-01`)
    .eq("status", "active");
  const donations = (donationsData ?? []) as {
    amount: number;
    kind: DonationKind;
    donation_date: string;
  }[];

  const tableMissing =
    (feesError as { code?: string } | null)?.code === "42P01" ||
    (expensesError as { code?: string } | null)?.code === "42P01" ||
    (donationsError as { code?: string } | null)?.code === "42P01";

  const feesTotal = fees.reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const donationsTotal = donations.reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0,
  );
  const incomeTotal = feesTotal + donationsTotal;
  const expensesTotal = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const balance = incomeTotal - expensesTotal;

  const monthRows = MONTHS.map((m) => {
    const key = `${year}-${m}`;
    const monthFees = fees
      .filter((f) => f.fee_month === key)
      .reduce((sum, f) => sum + (f.amount ?? 0), 0);
    const monthDonations = donations
      .filter((d) => d.donation_date.startsWith(key))
      .reduce((sum, d) => sum + (d.amount ?? 0), 0);
    const monthIncome = monthFees + monthDonations;
    const monthExpenses = expenses
      .filter((e) => e.expense_date.startsWith(key))
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    return {
      key,
      label: formatMonthUrdu(key),
      income: monthIncome,
      expenses: monthExpenses,
      balance: monthIncome - monthExpenses,
    };
  });

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
          <h2>سالانہ حسابات</h2>
          <span className="page-count">{year}</span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">سال</span>
            <input
              className="field-input"
              name="year"
              type="number"
              dir="ltr"
              min={2000}
              max={2100}
              defaultValue={year}
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
            <h3 className="form-section-title">خلاصہ</h3>
            <div className="detail-rows">
              <div className="row">
                <span>پورے سال کی فیس</span>
                <span>
                  {feesTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {fees.length.toLocaleString("ur-PK")} رسیدیں
                </span>
              </div>
              <div className="row">
                <span>پورے سال کے عطیات</span>
                <span>
                  {donationsTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {donations.length.toLocaleString("ur-PK")} عطیات
                </span>
              </div>
              <div className="row">
                <span>پورے سال کی کل آمدنی</span>
                <span>{incomeTotal.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>پورے سال کے اخراجات</span>
                <span>
                  {expensesTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {expenses.length.toLocaleString("ur-PK")} اخراجات
                </span>
              </div>
              <div className="row">
                <span>پورے سال کا بیلنس</span>
                <span>{balance.toLocaleString("ur-PK")} روپے</span>
              </div>
            </div>

            <h3 className="form-section-title">مہینہ بہ مہینہ</h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>مہینہ</th>
                    <th>آمدنی</th>
                    <th>اخراجات</th>
                    <th>بیلنس</th>
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <Link href={`/departments/monthly?month=${row.key}`}>
                          {row.label}
                        </Link>
                      </td>
                      <td>{row.income.toLocaleString("ur-PK")}</td>
                      <td>{row.expenses.toLocaleString("ur-PK")}</td>
                      <td>{row.balance.toLocaleString("ur-PK")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="form-section-title">اخراجات — زمرے کے حساب سے</h3>
            {categoryRows.length === 0 ? (
              <p className="empty-state">اس سال کا کوئی خرچ درج نہیں ہے۔</p>
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
              <p className="empty-state">اس سال کی کوئی فیس درج نہیں ہے۔</p>
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
              <p className="empty-state">اس سال کا کوئی عطیہ درج نہیں ہے۔</p>
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
          </>
        )}

      </div>
    </div>
  );
}
