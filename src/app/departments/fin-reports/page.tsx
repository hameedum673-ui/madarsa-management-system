/**
 * مرحلہ 23 — مالیاتی رپورٹس (سرور صفحہ، صرف دیکھنے کے لیے)
 * کوئی نئی میز نہیں — رپورٹ فیس کی رسیدوں (fee_payments)، عطیات
 * (donations)، اخراجات (expenses) اور زکوٰۃ (zakat_records) سے بنتی ہے۔
 * منسوخ اندراج رپورٹ میں نہیں گنا جاتا۔
 * زکوٰۃ الگ فنڈ ہے — بیلنس میں کبھی نہیں ملتی، صرف الگ دکھائی جاتی ہے۔
 * تاریخ کی حد چنیں، پھر "دکھائیں" دبائیں۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import type { SectionId } from "@/lib/students";
import { getMyAllowedSections } from "@/lib/permissions";
import { todayInKarachi } from "@/lib/attendance";
import {
  currentMonthInKarachi,
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

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export default async function FinReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayInKarachi();
  const defaultFrom = `${currentMonthInKarachi()}-01`;
  const rawFrom = params.from ?? defaultFrom;
  const rawTo = params.to ?? today;
  const from = isValidDate(rawFrom) && rawFrom <= today ? rawFrom : defaultFrom;
  const to = isValidDate(rawTo) && rawTo <= today && rawTo >= from ? rawTo : today;

  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);

  const { data: feesData, error: feesError } = await supabase
    .from("fee_payments")
    .select("amount, payment_method, students(section)")
    .gte("payment_date", from)
    .lte("payment_date", to)
    .eq("status", "active");
  // مرحلہ 54 — فیس صرف اجازت والے شعبے کی
  const fees = ((feesData ?? []) as unknown as {
    amount: number;
    payment_method: PaymentMethod;
    students: { section: string } | null;
  }[]).filter((f) =>
    allowedSections.has((f.students?.section ?? "banat") as SectionId),
  );

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, category")
    .gte("expense_date", from)
    .lte("expense_date", to)
    .eq("status", "active");
  const expenses = (expensesData ?? []) as {
    amount: number;
    category: ExpenseCategory;
  }[];

  const { data: donationsData, error: donationsError } = await supabase
    .from("donations")
    .select("amount, kind")
    .gte("donation_date", from)
    .lte("donation_date", to)
    .eq("status", "active");
  const donations = (donationsData ?? []) as {
    amount: number;
    kind: DonationKind;
  }[];

  // مرحلہ 48 — وکالت کا اصول: زکوٰۃ اور عشر آمدنی میں شامل ہیں
  // (وصولی مائنس تقسیم)۔ عشر کی میز نہ ہو تو خالی مانا جاتا ہے۔
  const { data: zakatData, error: zakatError } = await supabase
    .from("zakat_records")
    .select("amount, kind")
    .gte("record_date", from)
    .lte("record_date", to)
    .eq("status", "active");
  const zakat = (zakatData ?? []) as {
    amount: number;
    kind: "received" | "distributed";
  }[];
  const { data: ushrData } = await supabase
    .from("ushr_records")
    .select("amount, kind")
    .gte("record_date", from)
    .lte("record_date", to)
    .eq("status", "active");
  const ushr = (ushrData ?? []) as {
    amount: number;
    kind: "received" | "distributed";
  }[];

  const tableMissing =
    (feesError as { code?: string } | null)?.code === "42P01" ||
    (expensesError as { code?: string } | null)?.code === "42P01" ||
    (donationsError as { code?: string } | null)?.code === "42P01" ||
    (zakatError as { code?: string } | null)?.code === "42P01";

  const feesTotal = fees.reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const donationsTotal = donations.reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0,
  );
  // مرحلہ 49 — تقسیم ختم: صرف "وصولی" گنی جاتی ہے
  const zakatReceived = zakat
    .filter((z) => z.kind === "received")
    .reduce((sum, z) => sum + (z.amount ?? 0), 0);
  const ushrReceived = ushr
    .filter((u) => u.kind === "received")
    .reduce((sum, u) => sum + (u.amount ?? 0), 0);
  const incomeTotal =
    feesTotal + donationsTotal + zakatReceived + ushrReceived;
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
          <h2>مالیاتی رپورٹس</h2>
          <span className="page-count">
            {formatDate(from)} سے {formatDate(to)}
          </span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">سے (تاریخ)</span>
            <input
              className="field-input"
              name="from"
              type="date"
              defaultValue={from}
            />
          </label>
          <label className="field">
            <span className="field-label">تک (تاریخ)</span>
            <input
              className="field-input"
              name="to"
              type="date"
              defaultValue={to}
            />
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            فیس، اخراجات، عطیات یا زکوٰۃ کی میز ابھی نہیں بنی — پہلے متعلقہ
            مرحلوں کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <h3 className="form-section-title">خلاصہ</h3>
            <div className="detail-rows">
              <div className="row">
                <span>فیس</span>
                <span>
                  {feesTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {fees.length.toLocaleString("ur-PK")} رسیدیں
                </span>
              </div>
              <div className="row">
                <span>عطیات</span>
                <span>
                  {donationsTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {donations.length.toLocaleString("ur-PK")} عطیات
                </span>
              </div>
              <div className="row">
                <span>زکوٰۃ (وصولی)</span>
                <span>{zakatReceived.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>عشر (وصولی)</span>
                <span>{ushrReceived.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>کل آمدنی</span>
                <span>{incomeTotal.toLocaleString("ur-PK")} روپے</span>
              </div>
              <div className="row">
                <span>اخراجات</span>
                <span>
                  {expensesTotal.toLocaleString("ur-PK")} روپے
                  {" — "}
                  {expenses.length.toLocaleString("ur-PK")} اخراجات
                </span>
              </div>
              <div className="row">
                <span>بیلنس</span>
                <span>{balance.toLocaleString("ur-PK")} روپے</span>
              </div>
            </div>

            <h3 className="form-section-title">زکوٰۃ</h3>
            <div className="detail-rows">
              <div className="row">
                <span>کل وصول شدہ زکوٰۃ</span>
                <span>{zakatReceived.toLocaleString("ur-PK")} روپے</span>
              </div>
            </div>

            <h3 className="form-section-title">عشر</h3>
            <div className="detail-rows">
              <div className="row">
                <span>کل وصول شدہ عشر</span>
                <span>{ushrReceived.toLocaleString("ur-PK")} روپے</span>
              </div>
            </div>

            <h3 className="form-section-title">اخراجات — زمرے کے حساب سے</h3>
            {categoryRows.length === 0 ? (
              <p className="empty-state">اس مدت کا کوئی خرچ درج نہیں ہے۔</p>
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
              <p className="empty-state">اس مدت کی کوئی فیس درج نہیں ہے۔</p>
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
              <p className="empty-state">اس مدت کا کوئی عطیہ درج نہیں ہے۔</p>
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
              <Link className="btn-ghost" href="/departments/monthly">
                ماہانہ حسابات دیکھیں
              </Link>
              <Link className="btn-ghost" href="/departments/yearly">
                سالانہ حسابات دیکھیں
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
