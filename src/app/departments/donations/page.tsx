/**
 * مرحلہ 20 — صدقات اور عطیات کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * کل عطیات صرف فعال اندراجات کے ہیں — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * میز ابھی نہ بنی ہو (migration 014 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
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
  DONATION_KINDS,
  DONATION_KIND_LABELS,
  DONATION_STATUS_LABELS,
  type Donation,
  type DonationKind,
} from "@/lib/donations";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function DonationsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; section?: string; page?: string }>;
}) {
  const params = await searchParams;
  const rawKind = params.kind ?? "all";
  const kind: DonationKind | "all" = (DONATION_KINDS as string[]).includes(
    rawKind,
  )
    ? (rawKind as DonationKind)
    : "all";

  const supabase = await createClient();
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
    .from("donations")
    .select("*", { count: "exact" })
    .order("donation_date", { ascending: false })
    .order("receipt_number", { ascending: false });
  if (kind !== "all") query = query.eq("kind", kind);
  if (sectionEq) query = query.eq("section", sectionEq);
  query = query.range(from, to);
  const { data, error, count } = await query;

  const donations = (data ?? []) as Donation[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const pages = pageCount(count);
  // مرحلہ 59 — کل — پوری فلٹر شدہ فہرست سے (صرف اس صفحے سے نہیں)
  let totalQuery = supabase
    .from("donations")
    .select("amount")
    .eq("status", "active");
  if (kind !== "all") totalQuery = totalQuery.eq("kind", kind);
  if (sectionEq) totalQuery = totalQuery.eq("section", sectionEq);
  const { data: totalData } = await totalQuery;
  const totalDonations = (totalData ?? []).reduce(
    (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
    0,
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income" />
          <h2>صدقات اور عطیات</h2>
          <span className="page-count">
            کل: {totalDonations.toLocaleString("ur-PK")} روپے
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/donations/new">
            + نیا عطیہ
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">قسم</span>
            <select className="field-input" name="kind" defaultValue={kind}>
              <option value="all">سب</option>
              {DONATION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {DONATION_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
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
            عطیات کی میز ابھی نہیں بنی — پہلے مرحلہ 20 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : donations.length === 0 ? (
          <p className="empty-state">ابھی کوئی عطیہ درج نہیں ہے۔</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>قسم</th>
                  <th>عطیہ دینے والا</th>
                  <th>بنین / بنات</th>
                  <th>رقم</th>
                  <th>تاریخ</th>
                  <th>طریقہ</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/departments/donations/${d.id}`}>
                        {d.receipt_number}
                      </Link>
                    </td>
                    <td>{DONATION_KIND_LABELS[d.kind]}</td>
                    <td>
                      <Link href={`/departments/donations/${d.id}`}>
                        {d.donor_name}
                      </Link>
                    </td>
                    <td>{SECTION_LABELS[(d.section ?? "banat") as SectionId]}</td>
                    <td>{d.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(d.donation_date)}</td>
                    <td>{PAYMENT_METHOD_LABELS[d.payment_method]}</td>
                    <td>
                      <span
                        className={`badge${d.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {DONATION_STATUS_LABELS[d.status]}
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
