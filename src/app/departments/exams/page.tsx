/**
 * مرحلہ 10 — امتحانات کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کے امتحان نظر آتے ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * میز ابھی نہ بنی ہو (migration 008 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyLanguage } from "@/lib/language";
import { examTypeLabelLang, t } from "@/i18n/dictionary";
import {
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import {
  EXAM_TYPE_IDS,
  type Exam,
  type ExamType,
} from "@/lib/exams";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{
    section?: string;
    exam_type?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const [allowedSections, lang] = await Promise.all([
    getMyAllowedSections(supabase),
    getMyLanguage(),
  ]);
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";
  // مرحلہ 70 — امتحان کی قسم
  const rawType = params.exam_type ?? "all";
  const examType: ExamType | "all" = (EXAM_TYPE_IDS as string[]).includes(
    rawType,
  )
    ? (rawType as ExamType)
    : "all";

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("exams")
    .select("*", { count: "exact" })
    .order("exam_date", { ascending: false });
  if (section !== "all") query = query.eq("section", section);
  if (examType !== "all") query = query.eq("exam_type", examType);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  query = query.range(from, to);
  const { data, error, count } = await query;

  const exams = (data ?? []) as Exam[];
  const pages = pageCount(count);
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.exams")}</h2>
          <span className="page-count">
            {t(lang, "students.count_total", {
              n: (count ?? 0).toLocaleString("ur-PK"),
            })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/exams/new">
            {t(lang, "exams.new")}
          </Link>
        </div>

        <form className="att-controls" method="get">
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
                  {t(lang, "section." + s)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">
              {t(lang, "exams.filter.type")}
            </span>
            <select
              className="field-input"
              name="exam_type"
              defaultValue={examType}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {EXAM_TYPE_IDS.map((ty) => (
                <option key={ty} value={ty}>
                  {t(lang, "exam.type." + ty)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "exams.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : exams.length === 0 ? (
          <p className="empty-state">{t(lang, "exams.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "exams.col.exam")}</th>
                  <th>{t(lang, "att.form.date")}</th>
                  <th>{t(lang, "col.type")}</th>
                  <th>{t(lang, "col.dept")}</th>
                  <th>{t(lang, "exams.col.section")}</th>
                  <th>{t(lang, "col.class")}</th>
                  <th>{t(lang, "exams.col.subjects")}</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.id}>
                    <td>
                      <Link href={`/departments/exams/${ex.id}`}>
                        {ex.name}
                      </Link>
                    </td>
                    <td>{formatDate(ex.exam_date)}</td>
                    <td>{examTypeLabelLang(lang, ex.exam_type)}</td>
                    <td>{t(lang, "dept." + ex.department)}</td>
                    <td>
                      {ex.section ? t(lang, "section." + ex.section) : "—"}
                    </td>
                    <td>{ex.class_name ?? "—"}</td>
                    <td>{(ex.subjects ?? []).join("، ") || "—"}</td>
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
