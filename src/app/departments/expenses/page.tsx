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
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { getMyAllowedSections, getMySectionFilter } from "@/lib/permissions";
import { SECTION_IDS, type SectionId } from "@/lib/students";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
} from "@/lib/fees";
import type { Expense } from "@/lib/expenses";

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
  searchParams: Promise<{ month?: string; section?: string; page?: string }>;
}) {
  const params = await searchParams;
  const rawMonth = params.month ?? currentMonthInKarachi();
  const month: string | "all" =
    rawMonth === "all" ? "all" : isValidMonth(rawMonth) ? rawMonth : currentMonthInKarachi();

  const supabase = await createClient();
  const lang = await getMyLanguage();
  // مرحلہ 62 — اجازت والے شعبے + چنا ہوا شعبہ (بنین / بنات / سب)
  const allowedSections = await getMyAllowedSections(supabase);
  const section = getMySectionFilter(allowedSections, params.section);
  const sectionEq =
    section !== "all"
      ? section
      : allowedSections.size < 2
        ? ([...allowedSections][0] ?? "__none__")
        : null;
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
  if (sectionEq) query = query.eq("section", sectionEq);
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
  if (sectionEq) totalQuery = totalQuery.eq("section", sectionEq);
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
          <h2>{t(lang, "expenses.title")}</h2>
          <span className="page-count">
            {t(lang, "expenses.total_spent", { total: totalSpent.toLocaleString("ur-PK") })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/expenses/new">
            {t(lang, "expenses.add")}
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "fees.month")}</span>
            <input
              className="field-input"
              name="month"
              type="month"
              defaultValue={month === "all" ? "" : month}
            />
          </label>
          <label className="field">
            <span className="field-label">{t(lang, "students.section_filter")}</span>
            <select className="field-input" name="section" defaultValue={section}>
              <option value="all">{t(lang, "common.all")}</option>
              {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                <option key={s} value={s}>
                  {t(lang, `section.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
          <Link className="btn-ghost" href="/departments/expenses?month=all">
            {t(lang, "students.show_all")}
          </Link>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "expenses.table_missing")}
          </p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : expenses.length === 0 ? (
          <p className="empty-state">
            {t(lang, "expenses.empty")}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "exp.col_voucher")}</th>
                  <th>{t(lang, "exp.col_title")}</th>
                  <th>{t(lang, "exp.col_category")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "exp.col_amount")}</th>
                  <th>{t(lang, "col.date")}</th>
                  <th>{t(lang, "col.method")}</th>
                  <th>{t(lang, "col.status")}</th>
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
                    <td>{t(lang, `exp.cat.${e.category}`)}</td>
                    <td>{t(lang, `section.${(e.section ?? "banat") as SectionId}`)}</td>
                    <td>{e.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(e.expense_date)}</td>
                    <td>{t(lang, `fee.method.${e.payment_method}`)}</td>
                    <td>
                      <span
                        className={`badge${e.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `fee.status.${e.status}`)}
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
            {t(lang, "expenses.shown_month", { month: formatMonthUrdu(month) })}
          </p>
        ) : null}

        <Pagination page={page} totalPages={pages} params={params} lang={lang} />

      </div>
    </div>
  );
}
