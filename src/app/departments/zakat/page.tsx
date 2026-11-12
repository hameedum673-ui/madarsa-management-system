/**
 * مرحلہ 19 — زکوٰۃ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * خلاصہ صرف فعال اندراجات کا ہے — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * وکالت کا اصول (مرحلہ 48 سے): زکوٰۃ آمدنی میں شامل ہے اور ڈیش بورڈ
 * کے بیلنس میں گنی جاتی ہے (صرف وصولی)۔
 * میز ابھی نہ بنی ہو (migration 013 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections, getMySectionFilter } from "@/lib/permissions";
import { SECTION_IDS, SECTION_LABELS, type SectionId } from "@/lib/students";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  ZAKAT_STATUS_LABELS,
  type ZakatRecord,
} from "@/lib/zakat";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ZakatPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; page?: string }>;
}) {
  const supabase = await createClient();
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
    .from("zakat_records")
    .select("*", { count: "exact" })
    .order("record_date", { ascending: false })
    .order("receipt_number", { ascending: false });
  if (sectionEq) query = query.eq("section", sectionEq);
  query = query.range(from, to);
  const { data, error, count } = await query;

  const records = (data ?? []) as ZakatRecord[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const pages = pageCount(count);
  // مرحلہ 59 — کل وصول شدہ — پوری فہرست سے (صرف اس صفحے سے نہیں)
  // مرحلہ 49 — تقسیم ختم: صرف "وصولی" والے اندراج گنے جاتے ہیں
  let totalQuery = supabase
    .from("zakat_records")
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
          <h2>زکوٰۃ کا حساب</h2>
          <span className="page-count">
            کل وصول شدہ: {totalReceived.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/zakat/new">
            + نیا اندراج
          </Link>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>کل وصول شدہ زکوٰۃ</span>
            <span>{totalReceived.toLocaleString("ur-PK")} روپے</span>
          </div>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">شعبہ (بنین / بنات)</span>
            <select className="field-input" name="section" defaultValue={section}>
              <option value="all">سب</option>
              {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            زکوٰۃ کی میز ابھی نہیں بنی — پہلے مرحلہ 19 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : records.length === 0 ? (
          <p className="empty-state">ابھی کوئی زکوٰۃ اندراج درج نہیں ہے۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>نام</th>
                  <th>بنین / بنات</th>
                  <th>رقم</th>
                  <th>تاریخ</th>
                  <th>طریقہ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/departments/zakat/${r.id}`}>
                        {r.receipt_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/zakat/${r.id}`}>
                        {r.person_name}
                      </Link>
                    </td>
                    <td>{SECTION_LABELS[(r.section ?? "banat") as SectionId]}</td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.record_date)}</td>
                    <td>{PAYMENT_METHOD_LABELS[r.payment_method]}</td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {ZAKAT_STATUS_LABELS[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={params} />

      </div>
    </div>
  );
}
