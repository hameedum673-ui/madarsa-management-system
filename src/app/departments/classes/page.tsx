/**
 * مرحلہ 14 — درجات اور جماعتوں کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی جماعتیں نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * فہرست شعبے کے حساب سے ترتیب وار ہے (پہلے شعبہ، پھر ترتیب نمبر)۔
 * میز ابھی نہ بنی ہو (migration 011 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";
import type { MadrasaClass } from "@/lib/classes";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; section?: string; page?: string }>;
}) {
  const params = await searchParams;
  const rawDepartment = params.department ?? "all";
  const department: DepartmentId | "all" = (
    DEPARTMENT_IDS as string[]
  ).includes(rawDepartment)
    ? (rawDepartment as DepartmentId)
    : "all";

  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const [allowedSections, lang] = await Promise.all([
    getMyAllowedSections(supabase),
    getMyLanguage(),
  ]);
  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("classes")
    .select("*", { count: "exact" })
    .order("department", { ascending: true })
    .order("sort_order", { ascending: true });
  if (department !== "all") query = query.eq("department", department);
  // مرحلہ 51 — شعبے کا فلٹر (پہلے سے "سب")
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";
  if (section !== "all") query = query.eq("section", section);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  query = query.range(from, to);
  const { data, error, count } = await query;

  const classes = (data ?? []) as MadrasaClass[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "classes.title")}</h2>
          <span className="page-count">
            {t(lang, "students.count_total", {
              n: (count ?? 0).toLocaleString("ur-PK"),
            })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/classes/new">
            {t(lang, "classes.add")}
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "col.dept")}</span>
            <select
              className="field-input"
              name="department"
              defaultValue={department}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {DEPARTMENT_IDS.map((d) => (
                <option key={d} value={d}>
                  {t(lang, `dept.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">
              {t(lang, "classes.section_filter")}
            </span>
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
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "classes.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : classes.length === 0 ? (
          <p className="empty-state">{t(lang, "classes.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.sort_order")}</th>
                  <th>{t(lang, "col.class_name")}</th>
                  <th>{t(lang, "col.dept")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.sort_order.toLocaleString("ur-PK")}</td>
                    <td>
                      <Link href={`/departments/classes/${c.id}`}>
                        {c.name}
                      </Link>
                    </td>
                    <td>{t(lang, `dept.${c.department}`)}</td>
                    <td>{t(lang, `section.${c.section}`)}</td>
                    <td>
                      <span
                        className={`badge${c.status === "inactive" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `class.status.${c.status}`)}
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
