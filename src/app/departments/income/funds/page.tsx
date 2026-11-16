/**
 * مرحلہ 49 — زکوٰۃ، عشر اور عطیات: ملا ہوا صفحہ (سرور)
 * تینوں میزوں کی ایک فہرست — ہر قطار پر مد لکھی ہوتی ہے۔ قطار دبانے
 * پر اسی مد کا پرانا تفصیل والا صفحہ کھلتا ہے (منسوخ اور تصویر وہیں
 * سے ہوں گے)۔ ہر مد صرف اسی کو نظر آئے گی جسے اس کی اجازت ہے۔
 * تقسیم ختم ہے — زکوٰۃ اور عشر میں صرف وصولی گنی جاتی ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections, getMySectionFilter } from "@/lib/permissions";
import { SECTION_IDS, type SectionId } from "@/lib/students";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { isAppAdmin } from "@/lib/approval";
import { FUND_CATEGORIES, type FundCategory } from "@/lib/funds";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

interface FundRow {
  id: string;
  receipt_number: string;
  fund: FundCategory;
  kind?: string;
  name: string;
  amount: number;
  date: string;
  payment_method: string;
  status: string;
  section: string;
  detailHref: string;
}

export default async function FundsPage({
  searchParams,
}: {
  searchParams: Promise<{ fund?: string; section?: string; page?: string }>;
}) {
  const params = await searchParams;
  const rawFund = params.fund ?? "all";
  const fund: FundCategory | "all" = (
    FUND_CATEGORIES as string[]
  ).includes(rawFund)
    ? (rawFund as FundCategory)
    : "all";

  const supabase = await createClient();
  const lang = await getMyLanguage();
  const admin = await isAppAdmin(supabase);
  // مرحلہ 62 — اجازت والے شعبے + چنا ہوا شعبہ (بنین / بنات / سب)
  const allowedSections = await getMyAllowedSections(supabase);
  const section = getMySectionFilter(allowedSections, params.section);
  const sectionEq =
    section !== "all"
      ? section
      : allowedSections.size < 2
        ? ([...allowedSections][0] ?? "__none__")
        : null;

  let zakatAllowed = true;
  let ushrAllowed = true;
  let donationsAllowed = true;
  if (!admin) {
    const { data: zAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "zakat",
    });
    const { data: uAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "ushr",
    });
    const { data: dAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "donations",
    });
    zakatAllowed = zAllowed !== false;
    ushrAllowed = uAllowed !== false;
    donationsAllowed = dAllowed !== false;
  }

  // تینوں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (!zakatAllowed && !ushrAllowed && !donationsAllowed) {
    redirect("/");
  }

  const rows: FundRow[] = [];
  let tableMissing = false;

  if (zakatAllowed && (fund === "all" || fund === "zakat")) {
    const { data, error } = await supabase
      .from("zakat_records")
      .select("id, receipt_number, kind, person_name, amount, record_date, payment_method, section, status")
      .order("record_date", { ascending: false })
      .order("receipt_number", { ascending: false });
    if ((error as { code?: string } | null)?.code === "42P01")
      tableMissing = true;
    for (const r of (data ?? []) as {
      id: string;
      receipt_number: string;
      kind: string;
      person_name: string;
      amount: number;
      record_date: string;
      payment_method: string;
      status: string;
      section: string;
    }[]) {
      if (sectionEq && (r.section ?? "banat") !== sectionEq) continue;
      rows.push({
        id: r.id,
        receipt_number: r.receipt_number,
        fund: "zakat",
        kind: r.kind,
        name: r.person_name,
        amount: r.amount ?? 0,
        date: r.record_date,
        payment_method: r.payment_method,
        status: r.status,
        section: r.section ?? "banat",
        detailHref: `/departments/zakat/${r.id}`,
      });
    }
  }
  if (ushrAllowed && (fund === "all" || fund === "ushr")) {
    const { data, error } = await supabase
      .from("ushr_records")
      .select("id, receipt_number, kind, person_name, amount, record_date, payment_method, section, status")
      .order("record_date", { ascending: false })
      .order("receipt_number", { ascending: false });
    if ((error as { code?: string } | null)?.code === "42P01")
      tableMissing = true;
    for (const r of (data ?? []) as {
      id: string;
      receipt_number: string;
      kind: string;
      person_name: string;
      amount: number;
      record_date: string;
      payment_method: string;
      status: string;
      section: string;
    }[]) {
      if (sectionEq && (r.section ?? "banat") !== sectionEq) continue;
      rows.push({
        id: r.id,
        receipt_number: r.receipt_number,
        fund: "ushr",
        kind: r.kind,
        name: r.person_name,
        amount: r.amount ?? 0,
        date: r.record_date,
        payment_method: r.payment_method,
        status: r.status,
        section: r.section ?? "banat",
        detailHref: `/departments/ushr/${r.id}`,
      });
    }
  }
  if (donationsAllowed && (fund === "all" || fund === "sadaqah" || fund === "other")) {
    const { data, error } = await supabase
      .from("donations")
      .select("id, receipt_number, kind, donor_name, amount, donation_date, payment_method, section, status")
      .order("donation_date", { ascending: false })
      .order("receipt_number", { ascending: false });
    if ((error as { code?: string } | null)?.code === "42P01")
      tableMissing = true;
    for (const r of (data ?? []) as {
      id: string;
      receipt_number: string;
      kind: string;
      donor_name: string;
      amount: number;
      donation_date: string;
      payment_method: string;
      status: string;
      section: string;
    }[]) {
      const rowFund: FundCategory =
        r.kind === "other" ? "other" : "sadaqah";
      if (fund !== "all" && fund !== rowFund) continue;
      if (sectionEq && (r.section ?? "banat") !== sectionEq) continue;
      rows.push({
        id: r.id,
        receipt_number: r.receipt_number,
        fund: rowFund,
        name: r.donor_name,
        amount: r.amount ?? 0,
        date: r.donation_date,
        payment_method: r.payment_method,
        status: r.status,
        section: r.section ?? "banat",
        detailHref: `/departments/donations/${r.id}`,
      });
    }
  }

  rows.sort((a, b) =>
    a.date === b.date
      ? b.receipt_number.localeCompare(a.receipt_number)
      : b.date.localeCompare(a.date),
  );

  // خلاصہ — صرف فعال اور صرف "وصولی" (پرانے تقسیم والے یہاں نہیں گنے جاتے)
  const active = rows.filter((r) => r.status === "active");
  const totalOf = (f: FundCategory) =>
    active
      .filter((r) => r.fund === f)
      .filter((r) =>
        f === "zakat" || f === "ushr" ? r.kind === "received" : true,
      )
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const totals: { fund: FundCategory; total: number }[] = [];
  if (zakatAllowed) totals.push({ fund: "zakat", total: totalOf("zakat") });
  if (ushrAllowed) totals.push({ fund: "ushr", total: totalOf("ushr") });
  if (donationsAllowed) {
    totals.push({ fund: "sadaqah", total: totalOf("sadaqah") });
    totals.push({ fund: "other", total: totalOf("other") });
  }

  const visibleFunds: FundCategory[] = [];
  if (zakatAllowed) visibleFunds.push("zakat");
  if (ushrAllowed) visibleFunds.push("ushr");
  if (donationsAllowed) visibleFunds.push("sadaqah", "other");

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ؛ کل پوری فہرست سے)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);
  const pages = pageCount(rows.length);
  const pageRows = rows.slice(from, to);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/income" />
          <h2>{t(lang, "income.sec_funds")}</h2>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/income/funds/new">
{t(lang, "funds.add")}
          </Link>
        </div>

        <div className="detail-rows">
          {totals.map((tr) => (
            <div className="row" key={tr.fund}>
              <span>
                {t(lang, "funds.total_cat", {
                  cat: t(lang, `fund.cat.${tr.fund}`),
                })}
              </span>
              <span>
                {t(lang, "common.money", {
                  n: tr.total.toLocaleString("ur-PK"),
                })}
              </span>
            </div>
          ))}
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "funds.filter_fund")}</span>
            <select className="field-input" name="fund" defaultValue={fund}>
              <option value="all">{t(lang, "common.all")}</option>
              {visibleFunds.map((f) => (
                <option key={f} value={f}>
                  {t(lang, `fund.cat.${f}`)}
                </option>
              ))}
            </select>
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
        </form>

        {tableMissing ? (
          <p className="empty-state">
{t(lang, "funds.table_missing")}
          </p>
        ) : rows.length === 0 ? (
          <p className="empty-state">{t(lang, "funds.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.receipt")}</th>
                  <th>{t(lang, "funds.filter_fund")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "fee.amount_label")}</th>
                  <th>{t(lang, "col.date")}</th>
                  <th>{t(lang, "col.method")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={`${r.fund}-${r.id}`}>
                    <td>
                      <Link href={r.detailHref}>{r.receipt_number}</Link>
                    </td>
                    <td>{t(lang, `fund.cat.${r.fund}`)}</td>
                    <td>{t(lang, `section.${(r.section ?? "banat") as SectionId}`)}</td>
                    <td>
                      <Link href={r.detailHref}>{r.name}</Link>
                    </td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.date)}</td>
                    <td>
                      {
                        t(
                          lang,
                          `fee.method.${r.payment_method as string}`,
                        )
                      }
                    </td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {r.status === "voided"
                          ? t(lang, "fee.status.voided")
                          : t(lang, "fee.status.active")}
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
