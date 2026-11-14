/**
 * مرحلہ 13 — عملے کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا عملہ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 010 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  parsePage,
  pageRange,
  pageCount,
  sanitizeSearch,
} from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import type { StaffMember } from "@/lib/staff";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; page?: string }>;
}) {
  const params = await searchParams;
  // مرحلہ 58 — تلاش: نام، والد کا نام، یا فون نمبر سے
  const q = (params.q ?? "").trim();
  const safeQ = sanitizeSearch(q);
  // مرحلہ 51 — شعبے کا فلٹر (پہلے سے "سب")
  const supabase = await createClient();
  const langP = getMyLanguage();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("staff")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (section !== "all") query = query.eq("section", section);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  if (safeQ) {
    query = query.or(
      `name.ilike.%${safeQ}%,father_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`,
    );
  }
  query = query.range(from, to);
  const { data, error, count } = await query;

  const staff = (data ?? []) as StaffMember[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.staff")}</h2>
          <span className="page-count">
            {t(lang, "staff.count_total", { n: count ?? 0 })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/staff/new">
            {t(lang, "staff.add")}
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="att-field">
            <span className="att-label">{t(lang, "students.search_label")}</span>
            <input
              className="att-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t(lang, "staff.search_placeholder")}
            />
          </label>
          <label className="att-field">
            <span className="att-label">{t(lang, "students.section_filter")}</span>
            <select
              className="att-input"
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
          <button className="btn-primary" type="submit">
            {t(lang, "students.search_button")}
          </button>
          {q ? (
            <Link className="btn-ghost" href="/departments/staff">
              {t(lang, "students.show_all")}
            </Link>
          ) : null}
        </form>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "staff.table_missing")}
          </p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : staff.length === 0 ? (
          <p className="empty-state">
            {t(lang, "staff.empty")}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "col.father")}</th>
                  <th>{t(lang, "col.phone")}</th>
                  <th>{t(lang, "col.dept")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.position_work")}</th>
                  <th>{t(lang, "col.joining")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/staff/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td dir="ltr">{s.phone ?? "—"}</td>
                    <td>{t(lang, `dept.${s.department}`)}</td>
                    <td>{t(lang, `section.${s.section}`)}</td>
                    <td>{s.position ?? "—"}</td>
                    <td>{formatDate(s.joining_date)}</td>
                    <td>
                      <span
                        className={`badge${s.status === "withdrawn" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `person.status.${s.status}`)}
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
