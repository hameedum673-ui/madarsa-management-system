/**
 * درجہ وار حاضری کی رپورٹ — فلٹر (کلائنٹ)
 * حاضری لگانے والے صفحے والا طریقہ: بدلتے ہی صفحہ نئے پیرامیٹر کے
 * ساتھ دوبارہ کھلتا ہے — کوئی "دکھائیں" بٹن نہیں۔
 */
"use client";

import { useRouter } from "next/navigation";
import { DEPARTMENT_IDS, SECTION_IDS } from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";

export default function ReportFilters({
  date,
  department,
  section,
  allowedSections,
  lang = "ur",
}: {
  date: string;
  department: string;
  section: string;
  allowedSections: string[];
  lang?: Lang;
}) {
  const router = useRouter();
  function go(nextDate: string, nextDept: string, nextSection: string) {
    router.push(
      `/departments/att-students/report?date=${nextDate}&department=${nextDept}&section=${nextSection}`,
    );
  }

  return (
    <div className="att-controls no-print">
      <label className="field">
        <span className="field-label">{t(lang, "att.form.date")}</span>
        <input
          className="field-input"
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) go(e.target.value, department, section);
          }}
        />
      </label>
      <label className="field">
        <span className="field-label">{t(lang, "col.dept")}</span>
        <select
          className="field-input"
          value={department}
          onChange={(e) => go(date, e.target.value, section)}
        >
          <option value="all">{t(lang, "att.form.all_depts")}</option>
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
          value={section}
          onChange={(e) => go(date, department, e.target.value)}
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
