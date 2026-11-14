/**
 * مرحلہ 4 — طلبہ کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی طالبات نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 002 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  SECTION_IDS,
  type SectionId,
  type Student,
} from "@/lib/students";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; section?: string; page?: string }>;
}) {
  const sp = await searchParams;
  // مرحلہ 34 — تلاش: نام، والد کا نام، یا رجسٹریشن نمبر سے
  const q = (sp.q ?? "").trim();
  // تلاش کا لفظ صاف کریں تاکہ ڈیٹا بیس کی تلاش نہ ٹوٹے (%, _ اور , ہٹا دیں)
  const safeQ = q.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();
  // مرحلہ 51 — شعبے کا فلٹر (پہلے سے "سب")
  const supabase = await createClient();
  const langP = getMyLanguage();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);
  const lang = await langP;
  const rawSection = sp.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(sp.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (safeQ) {
    query = query.or(
      `name.ilike.%${safeQ}%,father_name.ilike.%${safeQ}%,registration_number.ilike.%${safeQ}%`,
    );
  }
  if (section !== "all") query = query.eq("section", section);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  query = query.range(from, to);
  const { data, error, count } = await query;

  const students = (data ?? []) as Student[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/admissions-students" />
          <h2>{t(lang, "module.students")}</h2>
          <span className="page-count">
            {q
              ? t(lang, "students.count_search", {
                  n: (count ?? 0).toLocaleString("ur-PK"),
                })
              : t(lang, "students.count_total", {
                  n: (count ?? 0).toLocaleString("ur-PK"),
                })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/students/new">
            {t(lang, "students.add")}
          </Link>
        </div>

        <form
          method="get"
          action="/departments/students"
          className="att-controls"
        >
          <label className="field">
            <span className="field-label">{t(lang, "students.search_label")}</span>
            <input
              className="field-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder={t(lang, "students.search_placeholder")}
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
          <button className="btn-primary" type="submit">
            {t(lang, "students.search_button")}
          </button>
          {q ? (
            <Link className="btn-ghost" href="/departments/students">
              {t(lang, "students.show_all")}
            </Link>
          ) : null}
        </form>
        <p className="sub">{t(lang, "students.hint")}</p>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "students.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            {q ? t(lang, "students.empty_search") : t(lang, "students.empty")}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.reg")}</th>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "col.father")}</th>
                  <th>{t(lang, "col.dept")}</th>
                  <th>{t(lang, "col.section")}</th>
                  <th>{t(lang, "col.class")}</th>
                  <th>{t(lang, "col.type")}</th>
                  <th>{t(lang, "col.admission_date")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/students/${s.id}`}>
                        {s.registration_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/students/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td>{t(lang, `dept.${s.department}`)}</td>
                    <td>{t(lang, `section.${s.section}`)}</td>
                    <td>{s.class_name ?? "—"}</td>
                    <td>{t(lang, `admission.type.${s.admission_type}`)}</td>
                    <td>{formatDate(s.admission_date)}</td>
                    <td>
                      <span
                        className={`badge${s.status === "withdrawn" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `student.status.${s.status}`)}
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
