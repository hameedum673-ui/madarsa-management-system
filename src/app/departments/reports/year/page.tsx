/**
 * سال کی رپورٹ — طالبات کی گنتی (سرور صفحہ)
 * صرف دیکھنے کے لیے ہے۔ سال چنیں + حصہ چنیں → خلاصہ (کل/فعال/خارج)
 * + شعبے کے حساب سے + جماعت کے حساب سے + پرنٹ۔ گنتی اندراج سے بنتی ہے۔
 * شعبے کی اجازت: جسے ایک حصہ دکھتا ہے اسے صرف اس کی گنتی دکھے گی
 * (حاضری کی جماعت وار رپورٹ والا طریقہ)۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections, getMySectionFilter } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import { buildYearSummary, getAllAcademicYears } from "@/lib/academicYears";
import { SECTION_IDS, type SectionId } from "@/lib/students";
import YearReportFilters from "./YearReportFilters";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function YearReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; section?: string }>;
}) {
  const supabase = await createClient();
  const [allowedSections, lang] = await Promise.all([
    getMyAllowedSections(supabase),
    getMyLanguage(),
  ]);
  const mine = await getMyMadrasa(supabase);
  const years = mine
    ? await getAllAcademicYears(supabase, mine.madrasaId)
    : [];
  const sp = await searchParams;
  const current = years.find((y) => y.is_current) ?? years[0] ?? null;
  const year =
    years.find((y) => y.id === (sp.year ?? "").trim()) ?? current;
  const section: SectionId | "all" = getMySectionFilter(
    allowedSections,
    sp.section,
  );

  if (!mine || years.length === 0 || !year) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/reports" />
            <h2>{t(lang, "year_report.title")}</h2>
          </div>
          <p className="sub">{t(lang, "settings.year.no_years")}</p>
          <div className="form-actions">
            <Link className="btn-primary" href="/departments/settings">
              {t(lang, "settings.title")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let enrQuery = supabase
    .from("enrollments")
    .select("class_name, department, section, status")
    .eq("madrasa_id", mine.madrasaId)
    .eq("academic_year_id", year.id);
  if (section !== "all") {
    enrQuery = enrQuery.eq("section", section);
  }
  if (allowedSections.size < 2) {
    enrQuery = enrQuery.eq(
      "section",
      [...allowedSections][0] ?? "__none__",
    );
  }
  const { data: enrData } = await enrQuery;
  const summary = buildYearSummary(
    (enrData ?? []) as {
      class_name: string | null;
      department: string;
      section: string;
      status: string;
    }[],
    t(lang, "att.report.no_class"),
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/reports" />
          <h2>{t(lang, "year_report.title")}</h2>
          <span className="page-count">{year.label}</span>
        </div>

        <div className="print-only print-sheet-head">
          <h2>{t(lang, "year_report.title")}</h2>
          <p>{year.label}</p>
        </div>

        <YearReportFilters
          yearId={year.id}
          years={years}
          section={section}
          allowedSections={[...allowedSections]}
          lang={lang}
        />

        <div className="form-actions no-print">
          <PrintButton lang={lang} />
        </div>

        {summary.total === 0 ? (
          <p className="empty-state">{t(lang, "year_report.empty")}</p>
        ) : (
          <>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "att.report.total")}</span>
                <strong>{summary.total.toLocaleString("ur-PK")}</strong>
              </div>
              <div className="row">
                <span>{t(lang, "person.status.active")}</span>
                <strong>{summary.active.toLocaleString("ur-PK")}</strong>
              </div>
              <div className="row">
                <span>{t(lang, "person.status.withdrawn")}</span>
                <strong>{summary.withdrawn.toLocaleString("ur-PK")}</strong>
              </div>
            </div>

            <h3 className="form-section-title">
              {t(lang, "year_report.by_department")}
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "col.dept")}</th>
                    <th>{t(lang, "person.status.active")}</th>
                    <th>{t(lang, "person.status.withdrawn")}</th>
                    <th>{t(lang, "att.report.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byDepartment.map((row) => (
                    <tr key={row.department}>
                      <td>{t(lang, `dept.${row.department}`)}</td>
                      <td>{row.active.toLocaleString("ur-PK")}</td>
                      <td>{row.withdrawn.toLocaleString("ur-PK")}</td>
                      <td>{row.total.toLocaleString("ur-PK")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="form-section-title">
              {t(lang, "year_report.by_class")}
            </h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "col.class")}</th>
                    <th>{t(lang, "col.dept")}</th>
                    <th>{t(lang, "students.section_filter")}</th>
                    <th>{t(lang, "person.status.active")}</th>
                    <th>{t(lang, "person.status.withdrawn")}</th>
                    <th>{t(lang, "att.report.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byClass.map((row) => (
                    <tr
                      key={`${row.department}|${row.section}|${row.class_name}`}
                    >
                      <td>{row.class_name}</td>
                      <td>{t(lang, `dept.${row.department}`)}</td>
                      <td>{t(lang, `section.${row.section}`)}</td>
                      <td>{row.active.toLocaleString("ur-PK")}</td>
                      <td>{row.withdrawn.toLocaleString("ur-PK")}</td>
                      <td>{row.total.toLocaleString("ur-PK")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
