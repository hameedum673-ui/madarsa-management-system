/**
 * مرحلہ 16 — اخراجات کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کے اخراجات نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * مہینے کا فلٹر: پہلے مہینہ چنیں، پھر "دکھائیں" دبائیں (فہرست اسی مہینے کی
 * دکھائی جاتی ہے)؛ "سب" چننے پر سارے اخراجات دکھائے جاتے ہیں۔
 * کل خرچ صرف فعال اخراجات کا ہے — منسوخ خرچ اس میں نہیں گنا جاتا۔
 * میز ابھی نہ بنی ہو (migration 012 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
  PAYMENT_METHOD_LABELS,
} from "@/lib/fees";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  type Expense,
} from "@/lib/expenses";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

/** "2026-11" کا اگلا مہینہ — "2026-12-01" */
function nextMonthStart(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return d.toISOString().slice(0, 7) + "-01";
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; page?: string }>;
}) {
  const params = await searchParams;
  const rawMonth = params.month ?? currentMonthInKarachi();
  const month: string | "all" =
    rawMonth === "all" ? "all" : isValidMonth(rawMonth) ? rawMonth : currentMonthInKarachi();

  const supabase = await createClient();
  // مرحلہ 59 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("expenses")
    .select("*", { count: "exact" })
    .order("expense_date", { ascending: false })
    .order("voucher_number", { ascending: false });
  if (month !== "all") {
    query = query
      .gte("expense_date", `${month}-01`)
      .lt("expense_date", nextMonthStart(month));
  }
  query = query.range(from, to);
  const { data, error, count } = await query;

  const expenses = (data ?? []) as Expense[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const pages = pageCount(count);
  // مرحلہ 59 — کل خرچ — پوری فلٹر شدہ فہرست سے (صرف اس صفحے سے نہیں)
  let totalQuery = supabase
    .from("expenses")
    .select("amount")
    .eq("status", "active");
  if (month !== "all") {
    totalQuery = totalQuery
      .gte("expense_date", `${month}-01`)
      .lt("expense_date", nextMonthStart(month));
  }
  const { data: totalData } = await totalQuery;
  const totalSpent = (totalData ?? []).reduce(
    (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
    0,
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>اخراجات کا ریکارڈ</h2>
          <span className="page-count">
            کل خرچ: {totalSpent.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/expenses/new">
            + نیا خرچ درج کریں
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">مہینہ</span>
            <input
              className="field-input"
              name="month"
              type="month"
              defaultValue={month === "all" ? "" : month}
            />
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
          <Link className="btn-ghost" href="/departments/expenses?month=all">
            سب دکھائیں
          </Link>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            اخراجات کی میز ابھی نہیں بنی — پہلے مرحلہ 16 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : expenses.length === 0 ? (
          <p className="empty-state">
            اس مہینے کا کوئی خرچ درج نہیں ہے۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>واؤچر نمبر</th>
                  <th>تفصیل</th>
                  <th>زمرہ</th>
                  <th>رقم</th>
                  <th>تاریخ</th>
                  <th>طریقہ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/departments/expenses/${e.id}`}>
                        {e.voucher_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/expenses/${e.id}`}>
                        {e.title}
                      </Link>
                    </td>
                    <td>{EXPENSE_CATEGORY_LABELS[e.category]}</td>
                    <td>{e.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(e.expense_date)}</td>
                    <td>{PAYMENT_METHOD_LABELS[e.payment_method]}</td>
                    <td>
                      <span
                        className={`badge${e.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {EXPENSE_STATUS_LABELS[e.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {month !== "all" ? (
          <p className="sub">
            دکھایا گیا مہینہ: {formatMonthUrdu(month)}
          </p>
        ) : null}

        <Pagination page={page} totalPages={pages} params={params} />

      </div>
    </div>
  );
}
