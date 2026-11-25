/**
 * مرحلہ 8 — فیس اور رسیدوں کی فہرست (سرور صفحہ، مرحلہ 48 سے /departments/income/fees پر)
 * صرف اپنے مدرسے کی فیس نظر آتی ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 006 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 * کل رقم صرف فعال رسیدوں کی ہوتی ہے — منسوخ شدہ شامل نہیں ہوتی۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import {
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
  type FeePayment,
} from "@/lib/fees";
import { getActiveClasses } from "@/lib/classes";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; section?: string; class?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const month =
    sp.month === "all"
      ? "all"
      : sp.month && isValidMonth(sp.month)
        ? sp.month
        : currentMonthInKarachi();

  // مرحلہ 52 — شعبے کا فلٹر (پہلے سے "سب")
  const supabase = await createClient();
  const lang = await getMyLanguage();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  const rawSection = sp.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";


  // درجے کا فلٹر — فعال جماعت کے نام سے تصدیق (حاضری رپورٹ والا طریقہ)
  const classes = await getActiveClasses(supabase);
  const rawClass = (sp.class ?? "all").trim();
  const className: string | "all" =
    rawClass !== "all" && classes.some((c) => c.name === rawClass)
      ? rawClass
      : "all";

  // مرحلہ 59 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ) + شعبہ اب ڈیٹا بیس
  // میں ہی فلٹر ہوتا ہے (ورنہ صفحہ غلط ہوتا)
  const page = parsePage(sp.page);
  const { from, to } = pageRange(page);
  const sectionEq =
    section !== "all"
      ? section
      : allowedSections.size < 2
        ? ([...allowedSections][0] ?? "__none__")
        : null;

  let query = supabase
    .from("fee_payments")
    .select("*, students(name, father_name, section, class_name)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (month !== "all") {
    query = query.eq("fee_month", month);
  }
  if (sectionEq) query = query.eq("students.section", sectionEq);
  if (className !== "all") query = query.eq("students.class_name", className);
  query = query.range(from, to);
  const { data, error, count } = await query;

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  // مرحلہ 59 — شعبہ اب اوپر ڈیٹا بیس میں ہی فلٹر ہوتا ہے
  const payments = (data ?? []) as (FeePayment & {
    students: { name: string; father_name: string; section: string; class_name: string | null } | null;
  })[];
  const pages = pageCount(count);
  // مرحلہ 59 — کل وصول شدہ — پوری فلٹر شدہ فہرست سے (صرف اس صفحے سے نہیں)
  let totalQuery = supabase
    .from("fee_payments")
    .select("amount, students(section, class_name)")
    .eq("status", "active");
  if (month !== "all") totalQuery = totalQuery.eq("fee_month", month);
  if (sectionEq) totalQuery = totalQuery.eq("students.section", sectionEq);
  if (className !== "all") totalQuery = totalQuery.eq("students.class_name", className);
  const { data: totalData } = await totalQuery;
  const totalCollected = (totalData ?? []).reduce(
    (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
    0,
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income" />
          <h2>{t(lang, "fees.title")}</h2>
          <span className="page-count">
            {month === "all"
              ? t(lang, "fees.all_months")
              : formatMonthUrdu(month)}
          </span>
          <span className="spacer" />
          <Link className="btn-ghost" href="/departments/income/schedule">
{t(lang, "income.view_schedule")}
          </Link>
          <Link className="btn-primary" href="/departments/income/fees/new">
{t(lang, "fees.add")}
          </Link>
        </div>

        <form
          method="get"
          action="/departments/income/fees"
          className="att-controls"
        >
          <label className="field">
            <span className="field-label">{t(lang, "fees.month")}</span>
            <input
              className="field-input"
              type="month"
              name="month"
              defaultValue={month === "all" ? "" : month}
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
                  {t(lang, `section.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t(lang, "col.class")}</span>
            <select
              className="field-input"
              name="class"
              defaultValue={className}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {classes.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.view")}
          </button>
          <Link className="btn-ghost" href="/departments/income/fees?month=all">
{t(lang, "fees.show_all_months")}
          </Link>
          <span className="spacer" />
          <span className="page-count">
            {t(lang, "fees.total_collected", {
              total: totalCollected.toLocaleString("ur-PK"),
            })}
          </span>
        </form>

        {tableMissing ? (
          <p className="empty-state">
{t(lang, "fees.table_missing")}
          </p>
        ) : error ? (
<p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : payments.length === 0 ? (
          <p className="empty-state">
{t(lang, "fees.empty")}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.receipt")}</th>
                  <th>{t(lang, "col.student")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.class")}</th>
                  <th>{t(lang, "fees.month")}</th>
                  <th>{t(lang, "col.amount")}</th>
                  <th>{t(lang, "col.method")}</th>
                  <th>{t(lang, "col.date")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/departments/income/fees/${p.id}`}>
                        {p.receipt_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/income/fees/${p.id}`}>
                        {p.students?.name ?? "—"}
                      </Link>
                    </td>
                    <td>
                      {p.students?.section
                        ? t(lang, `section.${p.students.section as SectionId}`)
                        : "—"}
                    </td>
                    <td>{p.students?.class_name ?? "—"}</td>
                    <td>{formatMonthUrdu(p.fee_month)}</td>
                    <td>{p.amount.toLocaleString("ur-PK")}</td>
                    <td>{t(lang, `fee.method.${p.payment_method}`)}</td>
                    <td>{formatDate(p.payment_date)}</td>
                    <td>
                      <span
                        className={`badge ${p.status === "voided" ? "badge-muted" : ""}`}
                      >
{t(lang, `fee.status.${p.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={sp} lang={lang} />

      </div>
    </div>
  );
}
