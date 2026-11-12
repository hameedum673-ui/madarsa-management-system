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
import {
  DEPARTMENT_LABELS,
  SECTION_IDS,
  SECTION_LABELS,
  type SectionId,
} from "@/lib/students";
import {
  examTypeLabel,
  EXAM_TYPE_IDS,
  EXAM_TYPE_LABELS,
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
  const allowedSections = await getMyAllowedSections(supabase);
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
          <h2>امتحانات اور نتائج</h2>
          <span className="page-count">
            کل: {(count ?? 0).toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/exams/new">
            + نیا امتحان بنائیں
          </Link>
        </div>

        <form className="att-controls" method="get">
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
          <label className="field">
            <span className="field-label">امتحان کی قسم</span>
            <select
              className="field-input"
              name="exam_type"
              defaultValue={examType}
            >
              <option value="all">سب</option>
              {EXAM_TYPE_IDS.map((t) => (
                <option key={t} value={t}>
                  {EXAM_TYPE_LABELS[t]}
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
            امتحانات کی میز ابھی نہیں بنی — پہلے مرحلہ 10 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : exams.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی امتحان نہیں بنایا گیا۔ اوپر والے بٹن سے پہلا امتحان بنائیں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>امتحان</th>
                  <th>تاریخ</th>
                  <th>قسم</th>
                  <th>شعبہ</th>
                  <th>بنین / بنات</th>
                  <th>جماعت</th>
                  <th>مضامین</th>
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
                    <td>{examTypeLabel(ex.exam_type)}</td>
                    <td>{DEPARTMENT_LABELS[ex.department]}</td>
                    <td>{ex.section ? SECTION_LABELS[ex.section] : "—"}</td>
                    <td>{ex.class_name ?? "—"}</td>
                    <td>{(ex.subjects ?? []).join("، ") || "—"}</td>
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
