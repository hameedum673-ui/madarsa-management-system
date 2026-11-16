/**
 * مرحلہ 48 — عشر کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * خلاصہ صرف فعال اندراجات کا ہے — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * وکالت کا اصول: عشر آمدنی میں شامل ہے اور ڈیش بورڈ کے بیلنس میں گنا
 * جاتا ہے (صرف وصولی)۔
 * میز ابھی نہ بنی ہو (migration 027 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
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
import { type UshrRecord } from "@/lib/ushr";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function UshrPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const lang = await getMyLanguage();
  // مرحلہ 59 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const params = await searchParams;
  // مرحلہ 62 — اجازت والے شعبے + چنا ہوا شعبہ (بنین / بنات / سب)
  const allowedSections = await getMyAllowedSections(supabase);
  const section = getMySectionFilter(allowedSections, params.section);
  const sectionEq =
    section !== "all"
      ? section
      : allowedSections.size < 2
        ? ([...allowedSections][0] ?? "__none__")
        : null;
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);
  let query = supabase
    .from("ushr_records")
    .select("*", { count: "exact" })
    .order("record_date", { ascending: false })
    .order("receipt_number", { ascending: false });
  if (sectionEq) query = query.eq("section", sectionEq);
  query = query.range(from, to);
  const { data, error, count } = await query;

  const records = (data ?? []) as UshrRecord[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const pages = pageCount(count);
  // مرحلہ 59 — کل وصول شدہ — پوری فہرست سے (صرف اس صفحے سے نہیں)
  // مرحلہ 49 — تقسیم ختم: صرف "وصولی" والے اندراج گنے جاتے ہیں
  let totalQuery = supabase
    .from("ushr_records")
    .select("amount")
    .eq("status", "active")
    .eq("kind", "received");
  if (sectionEq) totalQuery = totalQuery.eq("section", sectionEq);
  const { data: totalData } = await totalQuery;
  const totalReceived = (totalData ?? []).reduce(
    (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
    0,
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income" />
          <h2>{t(lang, "ushr.title")}</h2>
          <span className="page-count">
            {t(lang, "ushr.total_received", {
              total: totalReceived.toLocaleString("ur-PK"),
            })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/ushr/new">
            {t(lang, "funds.add")}
          </Link>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "ushr.total_received_label")}</span>
            <span>
              {t(lang, "common.money", {
                n: totalReceived.toLocaleString("ur-PK"),
              })}
            </span>
          </div>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">
              {t(lang, "students.section_filter")}
            </span>
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
        </form>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "ushr.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : records.length === 0 ? (
          <p className="empty-state">{t(lang, "ushr.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.receipt")}</th>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.amount")}</th>
                  <th>{t(lang, "col.date")}</th>
                  <th>{t(lang, "col.method")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/departments/ushr/${r.id}`}>
                        {r.receipt_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/ushr/${r.id}`}>
                        {r.person_name}
                      </Link>
                    </td>
                    <td>
                      {t(lang, `section.${(r.section ?? "banat") as SectionId}`)}
                    </td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.record_date)}</td>
                    <td>{t(lang, `fee.method.${r.payment_method}`)}</td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `fee.status.${r.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={params} lang={lang} />

      </div>
    </div>
  );
}
