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
import {
  SECTION_IDS,
  SECTION_LABELS,
  type SectionId,
} from "@/lib/students";
import {
  FEE_PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
  type FeePayment,
} from "@/lib/fees";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; section?: string; page?: string }>;
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
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  const rawSection = sp.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
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
    .select("*, students(name, father_name, section)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (month !== "all") {
    query = query.eq("fee_month", month);
  }
  if (sectionEq) query = query.eq("students.section", sectionEq);
  query = query.range(from, to);
  const { data, error, count } = await query;

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  // مرحلہ 59 — شعبہ اب اوپر ڈیٹا بیس میں ہی فلٹر ہوتا ہے
  const payments = (data ?? []) as (FeePayment & {
    students: { name: string; father_name: string; section: string } | null;
  })[];
  const pages = pageCount(count);
  // مرحلہ 59 — کل وصول شدہ — پوری فلٹر شدہ فہرست سے (صرف اس صفحے سے نہیں)
  let totalQuery = supabase
    .from("fee_payments")
    .select("amount, students(section)")
    .eq("status", "active");
  if (month !== "all") totalQuery = totalQuery.eq("fee_month", month);
  if (sectionEq) totalQuery = totalQuery.eq("students.section", sectionEq);
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
          <h2>آمدنی کا ریکارڈ — فیس اور رسیدیں</h2>
          <span className="page-count">
            {month === "all"
              ? "سب مہینے"
              : formatMonthUrdu(month)}
          </span>
          <span className="spacer" />
          <Link className="btn-ghost" href="/departments/income/schedule">
            فیس کا شیڈول دیکھیں
          </Link>
          <Link className="btn-primary" href="/departments/income/fees/new">
            + نئی فیس درج کریں
          </Link>
        </div>

        <form
          method="get"
          action="/departments/income/fees"
          className="att-controls"
        >
          <label className="field">
            <span className="field-label">مہینہ</span>
            <input
              className="field-input"
              type="month"
              name="month"
              defaultValue={month === "all" ? "" : month}
            />
          </label>
          <label className="field">
            <span className="field-label">شعبہ (بنین / بنات)</span>
            <select
              className="field-input"
              name="section"
              defaultValue={section}
            >
              <option value="all">سب</option>
              {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            دیکھیں
          </button>
          <Link className="btn-ghost" href="/departments/income/fees?month=all">
            سب مہینے دیکھیں
          </Link>
          <span className="spacer" />
          <span className="page-count">
            کل وصول شدہ: {totalCollected.toLocaleString("ur-PK")} روپے
          </span>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            فیس کی میز ابھی نہیں بنی — پہلے مرحلہ 8 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : payments.length === 0 ? (
          <p className="empty-state">
            اس مہینے کی کوئی فیس درج نہیں ہے۔ اوپر والے بٹن سے پہلی فیس درج کریں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رسید نمبر</th>
                  <th>طالبہ</th>
                  <th>بنین / بنات</th>
                  <th>مہینہ</th>
                  <th>رقم (روپے)</th>
                  <th>طریقہ</th>
                  <th>تاریخ</th>
                  <th>حالت</th>
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
                        ? SECTION_LABELS[p.students.section as SectionId]
                        : "—"}
                    </td>
                    <td>{formatMonthUrdu(p.fee_month)}</td>
                    <td>{p.amount.toLocaleString("ur-PK")}</td>
                    <td>{PAYMENT_METHOD_LABELS[p.payment_method]}</td>
                    <td>{formatDate(p.payment_date)}</td>
                    <td>
                      <span
                        className={`badge ${p.status === "voided" ? "badge-muted" : ""}`}
                      >
                        {FEE_PAYMENT_STATUS_LABELS[p.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={sp} />

      </div>
    </div>
  );
}
