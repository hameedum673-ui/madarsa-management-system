/**
 * سال کی رپورٹ — فلٹر (کلائنٹ)
 * سال یا حصہ بدلیں تو صفحہ نئے پیرامیٹر کے ساتھ دوبارہ کھلتا ہے —
 * کوئی "دکھائیں" بٹن نہیں (حاضری کی جماعت وار رپورٹ والا طریقہ)۔
 */
"use client";

import { useRouter } from "next/navigation";
import { SECTION_IDS } from "@/lib/students";
import type { AcademicYear } from "@/lib/academicYears";
import { t, type Lang } from "@/i18n/dictionary";

export default function YearReportFilters({
  yearId,
  years,
  section,
  allowedSections,
  lang = "ur",
}: {
  yearId: string;
  years: AcademicYear[];
  section: string;
  allowedSections: string[];
  lang?: Lang;
}) {
  const router = useRouter();
  function go(nextYear: string, nextSection: string) {
    router.push(
      `/departments/reports/year?year=${nextYear}&section=${nextSection}`,
    );
  }

  return (
    <div className="att-controls no-print">
      <label className="field">
        <span className="field-label">{t(lang, "year_report.year")}</span>
        <select
          className="field-input"
          value={yearId}
          onChange={(e) => go(e.target.value, section)}
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">
          {t(lang, "students.section_filter")}
        </span>
        <select
          className="field-input"
          value={section}
          onChange={(e) => go(yearId, e.target.value)}
        >
          <option value="all">{t(lang, "common.all")}</option>
          {SECTION_IDS.filter((s) => allowedSections.includes(s)).map((s) => (
            <option key={s} value={s}>
              {t(lang, `section.${s}`)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
