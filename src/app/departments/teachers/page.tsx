/**
 * مرحلہ 5 — اساتذہ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کے اساتذہ نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 003 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
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
import type { Teacher } from "@/lib/teachers";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function TeachersPage({
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
    .from("teachers")
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

  const teachers = (data ?? []) as Teacher[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.teachers")}</h2>
          <span className="page-count">
            {t(lang, "teachers.count_total", { n: count ?? 0 })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/teachers/new">
            {t(lang, "teachers.add")}
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
              placeholder={t(lang, "teachers.search_placeholder")}
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
            <Link className="btn-ghost" href="/departments/teachers">
              {t(lang, "students.show_all")}
            </Link>
          ) : null}
        </form>

        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "teachers.table_missing")}
          </p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : teachers.length === 0 ? (
          <p className="empty-state">
            {t(lang, "teachers.empty")}
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
                  <th>{t(lang, "col.position")}</th>
                  <th>{t(lang, "col.joining")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((tr) => (
                  <tr key={tr.id}>
                    <td>
                      <Link href={`/departments/teachers/${tr.id}`}>
                        {tr.name}
                      </Link>
                    </td>
                    <td>{tr.father_name}</td>
                    <td dir="ltr">{tr.phone ?? "—"}</td>
                    <td>{t(lang, `dept.${tr.department}`)}</td>
                    <td>{t(lang, `section.${tr.section}`)}</td>
                    <td>{tr.position ?? "—"}</td>
                    <td>{formatDate(tr.joining_date)}</td>
                    <td>
                      <span
                        className={`badge${tr.status === "withdrawn" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `person.status.${tr.status}`)}
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
