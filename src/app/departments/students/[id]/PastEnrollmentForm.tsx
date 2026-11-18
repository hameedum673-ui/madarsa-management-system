/**
 * پرانے سال میں داخلہ (کلائنٹ) — طالبہ کی تفصیل کا صفحہ۔
 * سال چنیں (صرف پرانے سال) + اس سال کی جماعت — محفوظ ہوتے ہی اس سال
 * میں طالبہ کی قطار بن جاتی ہے (دوبارہ ڈالنے پر جماعت بدلے، نقل نہ بنے)۔
 * اوپر طالبہ کے پہلے سے درج پرانے سال بھی دکھائے جاتے ہیں۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ClassSelect from "@/components/ClassSelect";
import { enrollInPastYear } from "@/app/departments/students/actions";
import type { AcademicYear, PastEnrollment } from "@/lib/academicYears";
import type { ClassOption } from "@/lib/classes";
import { t, type Lang } from "@/i18n/dictionary";

export default function PastEnrollmentForm({
  lang = "ur",
  studentId,
  pastYears,
  classes,
  department,
  section,
  existing,
}: {
  lang?: Lang;
  studentId: string;
  pastYears: AcademicYear[];
  classes: ClassOption[];
  department: string;
  section: string;
  existing: PastEnrollment[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (pastYears.length === 0) {
    return <p className="sub">{t(lang, "student.past_enroll.no_years")}</p>;
  }

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setDone(false);
    const formData = new FormData(ev.currentTarget);
    const yearId = String(formData.get("academic_year_id") ?? "").trim();
    const className = String(formData.get("class_name") ?? "").trim();
    if (!yearId) {
      setError(t(lang, "student.past_enroll.err.year"));
      return;
    }
    if (!className) {
      setError(t(lang, "student.past_enroll.err.class"));
      return;
    }
    setLoading(true);
    formData.set("lang", lang);
    const result = await enrollInPastYear(studentId, formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // محفوظ ہو گیا — صفحہ تازہ ہو تو درج سالوں کی فہرست میں نیا سال آئے گا
    setDone(true);
    router.refresh();
  }

  return (
    <div>
      {existing.length > 0 ? (
        <div className="detail-rows">
          {existing.map((row) => (
            <div className="row" key={row.year_id}>
              <span>{row.label}</span>
              <strong>{row.class_name ?? "—"}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="sub">{t(lang, "student.past_enroll.none")}</p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t(lang, "student.past_enroll.year")}</span>
            <select className="field-input" name="academic_year_id" required>
              <option value="">{t(lang, "student.past_enroll.err.year")}</option>
              {pastYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </select>
          </label>
          <ClassSelect
            classes={classes}
            department={department}
            section={section}
            lang={lang}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {done ? <p className="sub">{t(lang, "student.past_enroll.saved")}</p> : null}

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? t(lang, "common.wait") : t(lang, "common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
