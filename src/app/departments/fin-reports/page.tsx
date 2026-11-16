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
import { SECTION_IDS, type SectionId } from "@/lib/students";
import {
  getMyAllowedSections,
  getMySectionFilter,
} from "@/lib/permissions";
import { todayInKarachi } from "@/lib/attendance";
import {
  currentMonthInKarachi,
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
import { t } from "@/i18n/dictionary";
import { getMyLanguage } from "@/lib/language";

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
  searchParams: Promise<{ from?: string; to?: string; section?: string }>;
}) {
  const params = await searchParams;
  const lang = await getMyLanguage();
  const today = todayInKarachi();
  const defaultFrom = `${currentMonthInKarachi()}-01`;
  const rawFrom = params.from ?? defaultFrom;
  const rawTo = params.to ?? today;
  const from = isValidDate(rawFrom) && rawFrom <= today ? rawFrom : defaultFrom;
  const to = isValidDate(rawTo) && rawTo <= today && rawTo >= from ? rawTo : today;

  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  // مرحلہ 55 — چنا ہوا شعبہ (بنین / بنات / سب)
  const section = getMySectionFilter(allowedSections, params.section);
  const effectiveSections =
    section === "all" ? allowedSections : new Set<SectionId>([section]);

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
    effectiveSections.has((f.students?.section ?? "banat") as SectionId),
  );

  const { data: expensesData, error: expensesError } = await supabase
    .from("expenses")
    .select("amount, category, section")
    .gte("expense_date", from)
    .lte("expense_date", to)
    .eq("status", "active");
  // مرحلہ 62 — اخراجات بھی چنے ہوئے شعبے کے
  const expenses = ((expensesData ?? []) as {
    amount: number;
    category: ExpenseCategory;
    section: string;
  }[]).filter((e) =>
    effectiveSections.has((e.section ?? "banat") as SectionId),
  );

  const { data: donationsData, error: donationsError } = await supabase
    .from("donations")
    .select("amount, kind, section")
    .gte("donation_date", from)
    .lte("donation_date", to)
    .eq("status", "active");
  // مرحلہ 62 — عطیات بھی چنے ہوئے شعبے کے
  const donations = ((donationsData ?? []) as {
    amount: number;
    kind: DonationKind;
    section: string;
  }[]).filter((d) =>
    effectiveSections.has((d.section ?? "banat") as SectionId),
  );

  // مرحلہ 48 — وکالت کا اصول: زکوٰۃ اور عشر آمدنی میں شامل ہیں
  // (وصولی مائنس تقسیم)۔ عشر کی میز نہ ہو تو خالی مانا جاتا ہے۔
  const { data: zakatData, error: zakatError } = await supabase
    .from("zakat_records")
    .select("amount, kind, section")
    .gte("record_date", from)
    .lte("record_date", to)
    .eq("status", "active");
  // مرحلہ 62 — زکوٰۃ بھی چنے ہوئے شعبے کی
  const zakat = ((zakatData ?? []) as {
    amount: number;
    kind: "received" | "distributed";
    section: string;
  }[]).filter((r) =>
    effectiveSections.has((r.section ?? "banat") as SectionId),
  );
  const { data: ushrData } = await supabase
    .from("ushr_records")
    .select("amount, kind, section")
    .gte("record_date", from)
    .lte("record_date", to)
    .eq("status", "active");
  // مرحلہ 62 — عشر بھی چنے ہوئے شعبے کا
  const ushr = ((ushrData ?? []) as {
    amount: number;
    kind: "received" | "distributed";
    section: string;
  }[]).filter((r) =>
    effectiveSections.has((r.section ?? "banat") as SectionId),
  );

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
          <h2>{t(lang, "finreports.title")}</h2>
          <span className="page-count">
            {t(lang, "finreports.range", {
              from: formatDate(from),
              to: formatDate(to),
            })}
          </span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "finreports.from_label")}</span>
            <input
              className="field-input"
              name="from"
              type="date"
              defaultValue={from}
            />
          </label>
          <label className="field">
            <span className="field-label">{t(lang, "finreports.to_label")}</span>
            <input
              className="field-input"
              name="to"
              type="date"
              defaultValue={to}
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
                  {t(lang, s === "banin" ? "section.banin" : "section.banat")}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        <p className="sub">{t(lang, "finreports.note")}</p>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "finreports.table_missing")}</p>
        ) : (
          <>
            <h3 className="form-section-title">
              {t(lang, "monthly.summary_title")}
            </h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "finreports.fees")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: feesTotal.toLocaleString("ur-PK"),
                  })}
                  {" — "}
                  {fees.length.toLocaleString("ur-PK")}{" "}
                  {t(lang, "finreports.receipts")}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "finreports.donations")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: donationsTotal.toLocaleString("ur-PK"),
                  })}
                  {" — "}
                  {donations.length.toLocaleString("ur-PK")}{" "}
                  {t(lang, "finreports.donations")}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "finreports.zakat_received")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: zakatReceived.toLocaleString("ur-PK"),
                  })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "finreports.ushr_received")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: ushrReceived.toLocaleString("ur-PK"),
                  })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "finreports.total_income")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: incomeTotal.toLocaleString("ur-PK"),
                  })}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "finreports.expenses")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: expensesTotal.toLocaleString("ur-PK"),
                  })}
                  {" — "}
                  {expenses.length.toLocaleString("ur-PK")}{" "}
                  {t(lang, "finreports.expenses")}
                </span>
              </div>
              <div className="row">
                <span>{t(lang, "finreports.balance")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: balance.toLocaleString("ur-PK"),
                  })}
                </span>
              </div>
            </div>

            <h3 className="form-section-title">
              {t(lang, "fund.cat.zakat")}
            </h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "finreports.zakat_received_total")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: zakatReceived.toLocaleString("ur-PK"),
                  })}
                </span>
              </div>
            </div>

            <h3 className="form-section-title">
              {t(lang, "fund.cat.ushr")}
            </h3>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "finreports.ushr_received_total")}</span>
                <span>
                  {t(lang, "common.money", {
                    n: ushrReceived.toLocaleString("ur-PK"),
                  })}
                </span>
              </div>
            </div>

            <h3 className="form-section-title">
              {t(lang, "finreports.by_category")}
            </h3>
            {categoryRows.length === 0 ? (
              <p className="empty-state">
                {t(lang, "finreports.no_expenses")}
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "finreports.col_category")}</th>
                      <th>{t(lang, "finreports.col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryRows.map((c) => (
                      <tr key={c}>
                        <td>{t(lang, `exp.cat.${c}`)}</td>
                        <td>
                          {t(lang, "common.money", {
                            n: (byCategory.get(c) ?? 0).toLocaleString("ur-PK"),
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">
              {t(lang, "finreports.by_method")}
            </h3>
            {methodRows.length === 0 ? (
              <p className="empty-state">{t(lang, "finreports.no_fees")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.method")}</th>
                      <th>{t(lang, "finreports.col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {methodRows.map((m) => (
                      <tr key={m}>
                        <td>{t(lang, `fee.method.${m}`)}</td>
                        <td>
                          {t(lang, "common.money", {
                            n: (byMethod.get(m) ?? 0).toLocaleString("ur-PK"),
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h3 className="form-section-title">
              {t(lang, "finreports.by_kind")}
            </h3>
            {kindRows.length === 0 ? (
              <p className="empty-state">
                {t(lang, "finreports.no_donations")}
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.type")}</th>
                      <th>{t(lang, "finreports.col_amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kindRows.map((k) => (
                      <tr key={k}>
                        <td>{t(lang, `monthly.kind.${k}`)}</td>
                        <td>
                          {t(lang, "common.money", {
                            n: (byKind.get(k) ?? 0).toLocaleString("ur-PK"),
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="form-actions">
              <Link className="btn-ghost" href="/departments/monthly">
                {t(lang, "finreports.view_monthly")}
              </Link>
              <Link className="btn-ghost" href="/departments/yearly">
                {t(lang, "finreports.view_yearly")}
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
