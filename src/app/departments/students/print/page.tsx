/**
 * جماعت وار فہرست — پرنٹ والا صفحہ (سرور صفحہ)
 * صرف داخل شدہ (فعال) طلبہ، بغیر صفحہ بندی کے — تاکہ جماعت کے
 * سارے طلبہ ایک فہرست میں چھپ سکیں۔ فلٹر وہی جو فہرست والے صفحے پر ہیں۔
 * پرنٹ میں صرف فہرست آتی ہے (بٹن/مینیو چھپ جاتے ہیں)۔
 */
import BackButton from "@/components/BackButton";
import PrintButton from "@/components/PrintButton";
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
import { getMyLanguage } from "@/lib/language";
import { getAllAcademicYears, type AcademicYear } from "@/lib/academicYears";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StudentsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    section?: string;
    department?: string;
    class?: string;
    year?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const lang = await getMyLanguage();
  // شعبے کی اجازت — ویسے ہی جیسے فہرست والے صفحے پر
  const allowedSections = await getMyAllowedSections(supabase);

  // فلٹر وہی جانچ جو فہرست والے صفحے پر ہے
  const q = (sp.q ?? "").trim();
  const safeQ = q.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();
  const rawSection = sp.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";
  const rawDepartment = sp.department ?? "all";
  const department: DepartmentId | "all" =
    (DEPARTMENT_IDS as string[]).includes(rawDepartment)
      ? (rawDepartment as DepartmentId)
      : "all";
  const classes = await getActiveClasses(supabase);
  const rawClass = (sp.class ?? "all").trim();
  const className: string | "all" =
    rawClass !== "all" && classes.some((c) => c.name === rawClass)
      ? rawClass
      : "all";

  // سال کا فلٹر — صرف اپنے مدرسے کے سال؛ غلط سال ہو تو "سب"
  let years: AcademicYear[] = [];
  let yearId: string | "all" = "all";
  let yearLabel: string | null = null;
  let madrasaId: string | null = null;
  try {
    const mine0 = await getMyMadrasa(supabase);
    if (mine0) {
      madrasaId = mine0.madrasaId;
      years = await getAllAcademicYears(supabase, mine0.madrasaId);
      const found = years.find((y) => y.id === (sp.year ?? "all").trim());
      if (found) {
        yearId = found.id;
        yearLabel = found.label;
      }
    }
  } catch {
    years = [];
    yearId = "all";
    madrasaId = null;
  }

  // صرف فعال طلبہ، داخلہ نمبر کے حساب سے، بغیر صفحہ بندی کے
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
      const ids = ((enrData ?? []) as { student_id: string }[]).map(
        (r) => r.student_id,
      );
      if (ids.length === 0) {
        students = [];
      } else {
        let sq = supabase
          .from("students")
          .select("*")
          .eq("status", "active")
          .in("id", ids)
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
    // "سب" — آج کا طریقہ ویسا ہی
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
    const res = await query;
    students = (res.data ?? []) as Student[];
    error = res.error;
  }

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  // مدرسے کا نام سرنامے کے لیے (تفصیلی صفحوں والا طریقہ)
  let madrasaName = t(lang, "app.name");
  const mine = await getMyMadrasa(supabase);
  if (mine) {
    const { data: madrasa } = await supabase
      .from("madrasas")
      .select("name")
      .eq("id", mine.madrasaId)
      .single();
    if (madrasa?.name) madrasaName = madrasa.name as string;
  }

  const today = formatDate(new Date().toISOString());
  const total = students.length.toLocaleString("ur-PK");
  const metaLine = [
    `${t(lang, "students.year_filter")}: ${yearLabel ?? t(lang, "students.year_all")}`,
    `${t(lang, "col.class")}: ${className !== "all" ? className : t(lang, "common.all")}`,
    `${t(lang, "col.dept")}: ${department !== "all" ? t(lang, `dept.${department}`) : t(lang, "common.all")}`,
    `${t(lang, "col.section")}: ${section !== "all" ? t(lang, `section.${section}`) : t(lang, "common.all")}`,
  ].join(" — ");

  // واپسی — وہی فلٹر ساتھ لے کر فہرست والے صفحے پر
  const backParams = new URLSearchParams();
  if (q) backParams.set("q", q);
  if (department !== "all") backParams.set("department", department);
  if (section !== "all") backParams.set("section", section);
  if (className !== "all") backParams.set("class", className);
  if (yearId !== "all") backParams.set("year", yearId);
  const backHref = backParams.toString()
    ? `/departments/students?${backParams.toString()}`
    : "/departments/students";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head no-print">
          <BackButton href={backHref} />
          <h2>{t(lang, "students.roster_title")}</h2>
          <span className="page-count">
            {t(lang, "students.count_total", { n: total })}
          </span>
          <span className="spacer" />
          <PrintButton lang={lang} />
        </div>

        {/* سال کا فلٹر (صرف اسکرین پر — پرنٹ میں نہیں آتا) */}
        <form
          method="get"
          action="/departments/students/print"
          className="att-controls no-print"
        >
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {department !== "all" ? (
            <input type="hidden" name="department" value={department} />
          ) : null}
          {section !== "all" ? (
            <input type="hidden" name="section" value={section} />
          ) : null}
          {className !== "all" ? (
            <input type="hidden" name="class" value={className} />
          ) : null}
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

        {/* پرنٹ والی شیٹ کا سرنامہ (صرف پرنٹ میں دکھتا ہے) */}
        <div className="print-only print-sheet-head">
          <h2>{madrasaName}</h2>
          <p>
            {t(lang, "students.roster_title")} — {metaLine}
          </p>
          <p>
            {t(lang, "students.roster_date", { date: today })} —{" "}
            {t(lang, "students.count_total", { n: total })}
          </p>
        </div>

        <p className="sub no-print">
          {metaLine} — {t(lang, "students.roster_date", { date: today })}
        </p>

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
            <table className="tbl exam-print">
              <thead>
                <tr>
                  <th>{t(lang, "exam.result.serial")}</th>
                  <th>{t(lang, "col.reg")}</th>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "col.father")}</th>
                  <th>{t(lang, "col.admission_date")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td>{(i + 1).toLocaleString("ur-PK")}</td>
                    <td>{s.registration_number}</td>
                    <td>{s.name}</td>
                    <td>{s.father_name}</td>
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
