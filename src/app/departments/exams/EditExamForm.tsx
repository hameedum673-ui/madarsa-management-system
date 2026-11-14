/**
 * مرحلہ 71 — موجودہ امتحان میں ترمیم کا فارم
 * بدلا جا سکتا ہے: نام، تاریخ، قسم، مضامین۔
 * نہیں بدلا جا سکتا: شعبہ، بنین/بنات، جماعت (صرف پڑھنے کے لیے)۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import {
  EXAM_TYPE_IDS,
  type Exam,
  type ExamType,
} from "@/lib/exams";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function EditExamForm({
  exam,
  action,
  lang = "ur",
}: {
  exam: Exam;
  action: FormAction;
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [examType, setExamType] = useState<ExamType>(
    (exam.exam_type as ExamType | null) ?? "quarterly",
  );

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
    router.push(`/departments/exams/${exam.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="detail-rows">
        <div className="row">
          <span>{t(lang, "col.dept")}</span>
          <span>{t(lang, "dept." + exam.department)}</span>
        </div>
        <div className="row">
          <span>{t(lang, "classes.section_filter")}</span>
          <span>
            {exam.section ? t(lang, "section." + exam.section) : "—"}
          </span>
        </div>
        <div className="row">
          <span>{t(lang, "col.class")}</span>
          <span>
            {exam.class_name ?? t(lang, "exam.form.whole_dept")}
          </span>
        </div>
      </div>
      <p className="form-note">{t(lang, "exam.edit.locked_note")}</p>

      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "exam.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={exam.name}
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
            defaultValue={exam.exam_date}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">{t(lang, "exam.form.subjects")}</span>
        <textarea
          className="field-input field-textarea"
          name="subjects"
          required
          maxLength={1000}
          defaultValue={(exam.subjects ?? []).join("، ")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">{t(lang, "exam.edit.note")}</p>

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "student.form.update")}
        </button>
        <Link className="btn-ghost" href={`/departments/exams/${exam.id}`}>
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
