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
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import {
  getMyAllowedSections,
  getMySectionFilter,
} from "@/lib/permissions";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
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
import { getBalanceBefore, isMonthClosed } from "@/lib/monthClosing";
import {
  getMyMadrasa,
  SECTION_IDS,
  SECTION_LABELS,
  type SectionId,
} from "@/lib/students";
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
  searchParams: Promise<{ month?: string; section?: string }>;
}) {
  const params = await searchParams;
  const rawMonth = params.month ?? currentMonthInKarachi();
  const month = isValidMonth(rawMonth) ? rawMonth : currentMonthInKarachi();

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
    .select("amount, payment_method, students(section)")
    .eq("fee_month", month)
    .eq("status", "active");
  // مرحلہ 54 — فیس صرف اجازت والے شعبے کی
  const fees = ((feesData ?? []) as unknown as {
    amount: number;
    payment_method: PaymentMethod;
    students: { section: string } | null;
  }[]).filter((f) =>
    effectiveSections.has((f.students?.section ?? "banat") as SectionId),
  );

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, category, section")
    .gte("expense_date", `${month}-01`)
    .lt("expense_date", nextMonthStart(month))
    .eq("status", "active");
  // مرحلہ 62 — اخراجات بھی چنے ہوئے شعبے کے
  const expenses = ((expensesData ?? []) as {
    amount: number;
    category: ExpenseCategory;
    section: string;
  }[]).filter((e) =>
    effectiveSections.has((e.section ?? "banat") as SectionId),
  );

  // مرحلہ 20 — عطیات بھی آمدنی ہیں (فیس کے ساتھ)
  const { data: donationsData, error: donationsError } = await supabase
    .from("donations")
    .select("amount, kind, section")
    .gte("donation_date", `${month}-01`)
    .lt("donation_date", nextMonthStart(month))
    .eq("status", "active");
  // مرحلہ 62 — عطیات بھی چنے ہوئے شعبے کے
  const donations = ((donationsData ?? []) as {
    amount: number;
    kind: DonationKind;
    section: string;
  }[]).filter((d) =>
    effectiveSections.has((d.section ?? "banat") as SectionId),
  );

  // مرحلہ 48 — وکالت کا اصول: زکوٰۃ اور عشر بھی آمدنی ہیں
  // (وصولی مائنس تقسیم)۔ میز نہ ہو تو خالی مانا جاتا ہے۔
  const { data: zakatData } = await supabase
    .from("zakat_records")
    .select("kind, amount, section")
    .gte("record_date", `${month}-01`)
    .lt("record_date", nextMonthStart(month))
    .eq("status", "active");
  // مرحلہ 62 — زکوٰۃ بھی چنے ہوئے شعبے کی
  const zakatRows = ((zakatData ?? []) as {
    kind: string;
    amount: number;
    section: string;
  }[]).filter((r) =>
    effectiveSections.has((r.section ?? "banat") as SectionId),
  );
  const { data: ushrData } = await supabase
    .from("ushr_records")
    .select("kind, amount, section")
    .gte("record_date", `${month}-01`)
    .lt("record_date", nextMonthStart(month))
    .eq("status", "active");
  // مرحلہ 62 — عشر بھی چنے ہوئے شعبے کا
  const ushrRows = ((ushrData ?? []) as {
    kind: string;
    amount: number;
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

  // مرحلہ 39 — اس مہینے کی بندش + پچھلا بقیہ (میز نہ ہو تو کھلا مانا جاتا ہے)
  const mine = await getMyMadrasa(supabase);
  let monthClosed = false;
  let openingBalance = 0;
  if (mine) {
    monthClosed = await isMonthClosed(supabase, mine.madrasaId, month);
    openingBalance = await getBalanceBefore(supabase, month, effectiveSections);
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
          <h2>{t(lang, "monthly.title")}</h2>
          <span className="page-count">{formatMonthUrdu(month)}</span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "fees.month")}</span>
            <input
              className="field-input"
              name="month"
              type="month"
              defaultValue={month}
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
            <h3 className="form-section-title">{t(lang, "monthly.closing_title")}</h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "monthly.closing_status")}</span>
                <span>
                  <span
                    className={`badge${monthClosed ? " badge-withdrawn" : ""}`}
                  >
                    {monthClosed ? t(lang, "monthly.closed") : t(lang, "monthly.open")}
                  </span>
                </span>
              </div>
            </div>
            <div className="form-actions">
              <MonthClosingControls month={month} isClosed={monthClosed} lang={lang} />
            </div>

            <h3 className="form-section-title">{t(lang, "monthly.summary_title")}</h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "monthly.opening_balance")}</span>
                <span>{t(lang, "common.money", { n: openingBalance.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.fees")}</span>
                <span>
                  {t(lang, "common.money", { n: feesTotal.toLocaleString("ur-PK") })}
                  {" — "}
                  {t(lang, "monthly.fees_receipts", { n: fees.length.toLocaleString("ur-PK") })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.donations")}</span>
                <span>
                  {t(lang, "common.money", { n: donationsTotal.toLocaleString("ur-PK") })}
                  {" — "}
                  {t(lang, "monthly.donations_count", { n: donations.length.toLocaleString("ur-PK") })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.zakat")}</span>
                <span>{t(lang, "common.money", { n: zakatNet.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.ushr")}</span>
                <span>{t(lang, "common.money", { n: ushrNet.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.total_income")}</span>
                <span>{t(lang, "common.money", { n: incomeTotal.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.total_expenses")}</span>
                <span>
                  {t(lang, "common.money", { n: expensesTotal.toLocaleString("ur-PK") })}
                  {" — "}
                  {t(lang, "monthly.expenses_count", { n: expenses.length.toLocaleString("ur-PK") })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.balance")}</span>
                <span>{t(lang, "common.money", { n: balance.toLocaleString("ur-PK") })}</span>
              </div>
              <div className="row">
                <span>{t(lang, "monthly.closing_balance")}</span>
                <span>
                  {t(lang, "common.money", { n: (openingBalance + balance).toLocaleString("ur-PK") })}
                </span>
              </div>
            </div>

            <h3 className="form-section-title">{t(lang, "monthly.expenses_by_category")}</h3>
            {categoryRows.length === 0 ? (
              <p className="empty-state">{t(lang, "monthly.no_expenses")}</p>
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
              <p className="empty-state">{t(lang, "monthly.no_fees")}</p>
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
              <p className="empty-state">{t(lang, "monthly.no_donations")}</p>
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

            <div className="form-actions">
              <Link
                className="btn-ghost"
                href={`/departments/income/fees?month=${month}`}
              >
                {t(lang, "monthly.view_income")}
              </Link>
              <Link
                className="btn-ghost"
                href={`/departments/expenses?month=${month}`}
              >
                {t(lang, "monthly.view_expenses")}
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
