/**
 * مرحلہ 15 — تعلیمی ریکارڈ: فعال طلبہ کی فہرست (سرور صفحہ)
 * صرف دیکھنے کا صفحہ ہے — ہر نام پر ٹیپ کرنے سے اس طالبہ کا مکمل تعلیمی
 * ریکارڈ کھلتا ہے۔ کوئی نئی میز نہیں — یہ فہرست students میز سے بنتی ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getActiveClasses } from "@/lib/classes";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  getMyMadrasa,
  type DepartmentId,
  type SectionId,
  type Student,
} from "@/lib/students";
import { getAllAcademicYears, type AcademicYear } from "@/lib/academicYears";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function AcademicPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    department?: string;
    section?: string;
    class?: string;
    year?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const safeQ = q.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();
  const rawDepartment = params.department ?? "all";
  const department: DepartmentId | "all" = (
    DEPARTMENT_IDS as string[]
  ).includes(rawDepartment)
    ? (rawDepartment as DepartmentId)
    : "all";

  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const [allowedSections, lang, classes] = await Promise.all([
    getMyAllowedSections(supabase),
    getMyLanguage(),
    getActiveClasses(supabase),
  ]);
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";
  const rawClass = (params.class ?? "all").trim();
  const className: string | "all" =
    rawClass !== "all" && classes.some((c) => c.name === rawClass)
      ? rawClass
      : "all";

  // سال کا فلٹر — صرف اپنے مدرسے کے سال؛ غلط یا دوسرے مدرسے کا سال ہو تو "سب"
  let years: AcademicYear[] = [];
  let yearId: string | "all" = "all";
  let madrasaId: string | null = null;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      madrasaId = mine.madrasaId;
      years = await getAllAcademicYears(supabase, mine.madrasaId);
      const found = years.find((y) => y.id === (params.year ?? "all").trim());
      if (found) yearId = found.id;
    }
  } catch {
    years = [];
    yearId = "all";
    madrasaId = null;
  }

  // سال چنا ہو تو جماعت کا کالم اس سال کی جماعت دکھاتا ہے
  const yearClassById = new Map<string, string | null>();
  let students: Student[] = [];
  let error: unknown = null;

  if (yearId !== "all" && madrasaId) {
    // اس سال کی قطاریں — شعبہ/حصہ/جماعت اس سال کے ریکارڈ سے
    let enrQuery = supabase
      .from("enrollments")
      .select("student_id, class_name, section, department")
      .eq("madrasa_id", madrasaId)
      .eq("academic_year_id", yearId);
    if (section !== "all") enrQuery = enrQuery.eq("section", section);
    if (department !== "all") enrQuery = enrQuery.eq("department", department);
    if (className !== "all") enrQuery = enrQuery.eq("class_name", className);
    if (allowedSections.size < 2)
      enrQuery = enrQuery.eq(
        "section",
        [...allowedSections][0] ?? "__none__",
      );
    const { data: enrData, error: enrError } = await enrQuery;
    if (enrError) {
      error = enrError;
    } else {
      const rows = (enrData ?? []) as {
        student_id: string;
        class_name: string | null;
      }[];
      for (const r of rows) yearClassById.set(r.student_id, r.class_name);
      const ids = rows.map((r) => r.student_id);
      if (ids.length === 0) {
        students = [];
      } else {
        let sq = supabase
          .from("students")
          .select("*")
          .in("id", ids)
          .eq("status", "active")
          .order("registration_number", { ascending: true });
        if (safeQ) {
          sq = sq.or(
            `name.ilike.%${safeQ}%,father_name.ilike.%${safeQ}%,registration_number.ilike.%${safeQ}%`,
          );
        }
        const res = await sq;
        students = (res.data ?? []) as Student[];
        error = res.error;
      }
    }
  } else {
    let query = supabase
      .from("students")
      .select("*")
      .eq("status", "active")
      .order("registration_number", { ascending: true });
    if (safeQ) {
      query = query.or(
        `name.ilike.%${safeQ}%,father_name.ilike.%${safeQ}%,registration_number.ilike.%${safeQ}%`,
      );
    }
    if (section !== "all") query = query.eq("section", section);
    if (department !== "all") query = query.eq("department", department);
    if (className !== "all") query = query.eq("class_name", className);
    if (allowedSections.size < 2)
      query = query.eq("section", [...allowedSections][0] ?? "__none__");
    const { data, error: qError } = await query;
    students = (data ?? []) as Student[];
    error = qError;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.academic")}</h2>
          <span className="page-count">
            {t(lang, "students.count_total", {
              n: students.length.toLocaleString("ur-PK"),
            })}
          </span>
        </div>

        <form className="att-controls" method="get">
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
          <label className="field">
            <span className="field-label">{t(lang, "col.class")}</span>
            <select
              className="field-input"
              name="class"
              defaultValue={className}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {classes.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t(lang, "students.year_filter")}</span>
            <select
              className="field-input"
              name="year"
              defaultValue={yearId}
            >
              <option value="all">{t(lang, "students.year_all")}</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        {error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            {t(lang, "academic.empty")}
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
                  <th>{t(lang, "col.class")}</th>
                  <th>{t(lang, "student.detail.admission_date")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/academic/${s.id}`}>
                        {s.registration_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/academic/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td>{t(lang, `dept.${s.department}`)}</td>
                    <td>
                      {yearId !== "all"
                        ? (yearClassById.get(s.id) ?? "—")
                        : (s.class_name || "—")}
                    </td>
                    <td>{formatDate(s.admission_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
