/**
 * مرحلہ 10 — نیا امتحان بنانے کا فارم
 * مضامین کوما سے الگ لکھیں — اردو کوما (،) اور انگریزی کوما (,) دونوں چلتے ہیں۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClassSelect from "@/components/ClassSelect";
import type { ClassOption } from "@/lib/classes";
import { t, type Lang } from "@/i18n/dictionary";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import {
  EXAM_TYPE_IDS,
  type ExamType,
} from "@/lib/exams";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id: string } | { error: string }>;

export default function ExamForm({
  action,
  classes = [],
  lang = "ur",
}: {
  action: FormAction;
  classes?: ClassOption[];
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // مرحلہ 36 — شعبہ بدلنے پر جماعت کی فہرست بھی بدلے
  const [department, setDepartment] = useState("hifz");
  // مرحلہ 52 — بنین / بنات (موجودہ مدرسہ للبنات ہے، اس لیے پہلے سے "بنات")
  const [section, setSection] = useState<SectionId>("banat");
  // مرحلہ 70 — امتحان کی قسم (سب سے عام: سہ ماہی)
  const [examType, setExamType] = useState<ExamType>("quarterly");

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(`/departments/exams/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "exam.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={200}
            placeholder={t(lang, "exam.form.name_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "exam.form.type")}</span>
          <select
            className="field-input"
            name="exam_type"
            required
            value={examType}
            onChange={(e) => setExamType(e.target.value as ExamType)}
          >
            {EXAM_TYPE_IDS.map((ty) => (
              <option key={ty} value={ty}>
                {t(lang, "exam.type." + ty)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "exam.form.date")}</span>
          <input
            className="field-input"
            name="exam_date"
            type="date"
            required
            defaultValue={today}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "exam.form.dept")}</span>
          <select
            className="field-input"
            name="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {t(lang, "dept." + d)}
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
            required
            value={section}
            onChange={(e) => setSection(e.target.value as SectionId)}
          >
            {SECTION_IDS.map((s) => (
              <option key={s} value={s}>
                {t(lang, "section." + s)}
              </option>
            ))}
          </select>
        </label>

        <ClassSelect classes={classes} department={department} section={section} lang={lang} />
      </div>

      <label className="field">
        <span className="field-label">{t(lang, "exam.form.subjects")}</span>
        <textarea
          className="field-input field-textarea"
          name="subjects"
          required
          maxLength={1000}
          placeholder={t(lang, "exam.form.subjects_ph")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">{t(lang, "exam.form.note")}</p>

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "exam.form.create")}
        </button>
        <Link className="btn-ghost" href="/departments/exams">
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
