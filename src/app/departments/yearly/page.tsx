/**
 * مرحلہ 18 — سالانہ حسابات (سرور صفحہ، صرف دیکھنے کے لیے)
 * کوئی نئی میز نہیں — خلاصہ فیس کی رسیدوں (fee_payments) اور اخراجات
 * (expenses) سے بنتا ہے۔ منسوخ رسید اور منسوخ خرچ خلاصے میں نہیں گنے جاتے۔
 * سال چنیں (عیسوی سال)، پھر "دکھائیں" دبائیں۔
 * مرحلہ 39 — سال کا ابتدائی بقیہ + اختتامی بقیہ + مہینوں کی بندش کی حالت
 * + پورا سال بند کرنا۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { SECTION_IDS, SECTION_LABELS, type SectionId } from "@/lib/students";
import {
  getMyAllowedSections,
  getMySectionFilter,
} from "@/lib/permissions";
import {
  formatMonthUrdu,
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/fees";
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
} from "@/lib/expenses";
import {
  DONATION_KINDS,
  type DonationKind,
} from "@/lib/donations";
import { getBalanceBefore } from "@/lib/monthClosing";
import CloseYearButton from "@/app/departments/yearly/CloseYearButton";

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
  searchParams: Promise<{ year?: string; section?: string }>;
}) {
  const params = await searchParams;
  const rawYear = params.year ?? currentYearInKarachi();
  const year = isValidYear(rawYear) ? rawYear : currentYearInKarachi();

  const supabase = await createClient();
  const lang = await getMyLanguage();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  // مرحلہ 55 — چنا ہوا شعبہ (بنین / بنات / سب)
  const section = getMySectionFilter(allowedSections, params.section);
  const effectiveSections =
    section === "all" ? allowedSections : new Set<SectionId>([section]);

  const { data: feesData, error: feesError } = await supabase
    .from("fee_payments")
    .select("amount, payment_method, fee_month, students(section)")
    .like("fee_month", `${year}-%`)
    .eq("status", "active");
  // مرحلہ 54 — فیس صرف اجازت والے شعبے کی
  const fees = ((feesData ?? []) as unknown as {
    amount: number;
    payment_method: PaymentMethod;
    fee_month: string;
    students: { section: string } | null;
  }[]).filter((f) =>
    effectiveSections.has((f.students?.section ?? "banat") as SectionId),
  );

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, category, expense_date, section")
    .gte("expense_date", `${year}-01-01`)
    .lt("expense_date", `${Number(year) + 1}-01-01`)
    .eq("status", "active");
  // مرحلہ 62 — اخراجات بھی چنے ہوئے شعبے کے
  const expenses = ((expensesData ?? []) as {
    amount: number;
    category: ExpenseCategory;
    expense_date: string;
    section: string;
  }[]).filter((e) =>
    effectiveSections.has((e.section ?? "banat") as SectionId),
  );

  // مرحلہ 20 — عطیات بھی آمدنی ہیں (فیس کے ساتھ)
  const { data: donationsData, error: donationsError } = await supabase
    .from("donations")
    .select("amount, kind, donation_date, section")
    .gte("donation_date", `${year}-01-01`)
    .lt("donation_date", `${Number(year) + 1}-01-01`)
    .eq("status", "active");
  // مرحلہ 62 — عطیات بھی چنے ہوئے شعبے کے
  const donations = ((donationsData ?? []) as {
    amount: number;
    kind: DonationKind;
    donation_date: string;
    section: string;
  }[]).filter((d) =>
    effectiveSections.has((d.section ?? "banat") as SectionId),
  );

  // مرحلہ 48 — وکالت کا اصول: زکوٰۃ اور عشر بھی آمدنی ہیں
  // (وصولی مائنس تقسیم)۔ میز نہ ہو تو خالی مانا جاتا ہے۔
  const { data: zakatData } = await supabase
    .from("zakat_records")
    .select("kind, amount, record_date, section")
    .gte("record_date", `${year}-01-01`)
    .lt("record_date", `${Number(year) + 1}-01-01`)
    .eq("status", "active");
  // مرحلہ 62 — زکوٰۃ بھی چنے ہوئے شعبے کی
  const zakatRows = ((zakatData ?? []) as {
    kind: string;
    amount: number;
    record_date: string;
    section: string;
  }[]).filter((r) =>
    effectiveSections.has((r.section ?? "banat") as SectionId),
  );
  const { data: ushrData } = await supabase
    .from("ushr_records")
    .select("kind, amount, record_date, section")
    .gte("record_date", `${year}-01-01`)
    .lt("record_date", `${Number(year) + 1}-01-01`)
    .eq("status", "active");
  // مرحلہ 62 — عشر بھی چنے ہوئے شعبے کا
  const ushrRows = ((ushrData ?? []) as {
    kind: string;
    amount: number;
    record_date: string;
    section: string;
  }[]).filter((r) =>
    effectiveSections.has((r.section ?? "banat") as SectionId),
  );
  // مرحلہ 49 — تقسیم ختم: صرف "وصولی" گنی جاتی ہے
  const netOf = (rows: { kind: string; amount: number }[]) =>
    rows
      .filter((r) => r.kind === "received")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  const tableMissing =
    (feesError as { code?: string } | null)?.code === "42P01" ||
    (expensesError as { code?: string } | null)?.code === "42P01" ||
    (donationsError as { code?: string } | null)?.code === "42P01";

  // مرحلہ 39 — سال کا ابتدائی بقیہ + مہینوں کی بندش کی حالت
  // (بندش کی میز نہ ہو تو سب مہینے کھلے مانے جاتے ہیں)
  const openingBalance = await getBalanceBefore(supabase, `${year}-01`, effectiveSections);
  const closedMonths = new Set<string>();
  try {
    const { data: closingsData } = await supabase
      .from("month_closings")
      .select("month, is_closed")
      .gte("month", `${year}-01`)
      .lte("month", `${year}-12`);
    for (const c of (closingsData ?? []) as {
      month: string;
      is_closed: boolean;
    }[]) {
      if (c.is_closed) closedMonths.add(c.month);
    }
  } catch {
    /* میز نہ ہو تو سب کھلے مانے جاتے ہیں */
  }

  const feesTotal = fees.reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const donationsTotal = donations.reduce(
    (sum, d) => sum + (d.amount ?? 0),
    0,
  );
  const zakatNet = netOf(zakatRows);
  const ushrNet = netOf(ushrRows);
  const incomeTotal = feesTotal + donationsTotal + zakatNet + ushrNet;
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
    const monthZakat = netOf(
      zakatRows.filter((z) => z.record_date.startsWith(key)),
    );
    const monthUshr = netOf(
      ushrRows.filter((u) => u.record_date.startsWith(key)),
    );
    const monthIncome = monthFees + monthDonations + monthZakat + monthUshr;
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
          <h2>{t(lang, "yearly.title")}</h2>
          <span className="page-count">{year}</span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "yearly.year_label")}</span>
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
          <label className="field">
            <span className="field-label">{t(lang, "students.section_filter")}</span>
            <select
              className="field-input"
              name="section"
              defaultValue={section}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        <p className="sub">{t(lang, "monthly.section_note")}</p>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "monthly.table_missing")}</p>
        ) : (
          <>
            <h3 className="form-section-title">{t(lang, "yearly.closing_title")}</h3>
            <div className="form-actions">
              <CloseYearButton
                year={year}
                allClosed={closedMonths.size === 12}
                lang={lang}
              />
            </div>

            <h3 className="form-section-title">{t(lang, "monthly.summary_title")}</h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "yearly.opening_balance")}</span>
                <span>{t(lang, "common.money", { n: openingBalance.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.fees")}</span>
                <span>
                  {t(lang, "common.money", { n: feesTotal.toLocaleString("ur-PK") })}
                  {" — "}
                  {t(lang, "monthly.fees_receipts", { n: fees.length.toLocaleString("ur-PK") })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.donations")}</span>
                <span>
                  {t(lang, "common.money", { n: donationsTotal.toLocaleString("ur-PK") })}
                  {" — "}
                  {t(lang, "monthly.donations_count", { n: donations.length.toLocaleString("ur-PK") })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.zakat")}</span>
                <span>{t(lang, "common.money", { n: zakatNet.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.ushr")}</span>
                <span>{t(lang, "common.money", { n: ushrNet.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.total_income")}</span>
                <span>{t(lang, "common.money", { n: incomeTotal.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.total_expenses")}</span>
                <span>
                  {t(lang, "common.money", { n: expensesTotal.toLocaleString("ur-PK") })}
                  {" — "}
                  {t(lang, "monthly.expenses_count", { n: expenses.length.toLocaleString("ur-PK") })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.balance")}</span>
                <span>{t(lang, "common.money", { n: balance.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "yearly.closing_balance")}</span>
                <span>
                  {t(lang, "common.money", { n: (openingBalance + balance).toLocaleString("ur-PK") })}
                </span>
              </div>
            </div>

            <h3 className="form-section-title">{t(lang, "yearly.by_month")}</h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "fees.month")}</th>
                    <th>{t(lang, "yearly.col_income")}</th>
                    <th>{t(lang, "yearly.col_expenses")}</th>
                    <th>{t(lang, "yearly.col_balance")}</th>
                    <th>{t(lang, "col.status")}</th>
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
                      <td>
                        <span
                          className={`badge${closedMonths.has(row.key) ? " badge-withdrawn" : ""}`}
                        >
                          {closedMonths.has(row.key) ? t(lang, "monthly.closed") : t(lang, "monthly.open")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="form-section-title">{t(lang, "monthly.expenses_by_category")}</h3>
            {categoryRows.length === 0 ? (
              <p className="empty-state">{t(lang, "yearly.no_expenses")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "exp.col_category")}</th>
                      <th>{t(lang, "exp.col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((c) => (
                      <tr key={c}>
                        <td>{t(lang, `exp.cat.${c}`)}</td>
                        <td>
                          {t(lang, "common.money", { n: (byCategory.get(c) ?? 0).toLocaleString("ur-PK") })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">{t(lang, "monthly.fees_by_method")}</h3>
            {methodRows.length === 0 ? (
              <p className="empty-state">{t(lang, "yearly.no_fees")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.method")}</th>
                      <th>{t(lang, "exp.col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodRows.map((m) => (
                      <tr key={m}>
                        <td>{t(lang, `fee.method.${m}`)}</td>
                        <td>
                          {t(lang, "common.money", { n: (byMethod.get(m) ?? 0).toLocaleString("ur-PK") })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">{t(lang, "monthly.donations_by_kind")}</h3>
            {kindRows.length === 0 ? (
              <p className="empty-state">{t(lang, "yearly.no_donations")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.type")}</th>
                      <th>{t(lang, "exp.col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kindRows.map((k) => (
                      <tr key={k}>
                        <td>{t(lang, `monthly.kind.${k}`)}</td>
                        <td>
                          {t(lang, "common.money", { n: (byKind.get(k) ?? 0).toLocaleString("ur-PK") })}
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
