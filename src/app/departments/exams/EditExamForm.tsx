/**
 * مرحلہ 71 — موجودہ امتحان میں ترمیم کا فارم
 * بدلا جا سکتا ہے: نام، تاریخ، قسم، مضامین۔
 * نہیں بدلا جا سکتا: شعبہ، بنین/بنات، جماعت (صرف پڑھنے کے لیے)۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EXAM_TYPE_IDS,
  EXAM_TYPE_LABELS,
  type Exam,
  type ExamType,
} from "@/lib/exams";
import { DEPARTMENT_LABELS, SECTION_LABELS } from "@/lib/students";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function EditExamForm({
  exam,
  action,
}: {
  exam: Exam;
  action: FormAction;
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
      <div className="detail-rows">
        <div className="row">
          <span>شعبہ</span>
          <span>{DEPARTMENT_LABELS[exam.department]}</span>
        </div>
        <div className="row">
          <span>شعبہ (بنین / بنات)</span>
          <span>{exam.section ? SECTION_LABELS[exam.section] : "—"}</span>
        </div>
        <div className="row">
          <span>جماعت</span>
          <span>{exam.class_name ?? "پورا شعبہ"}</span>
        </div>
      </div>
      <p className="form-note">
        شعبہ، بنین/بنات اور جماعت نہیں بدلے جا سکتے — یہ امتحان کی
        پہچان ہیں۔ اگر یہ غلط ہوں تو نیا امتحان بنانا ہوگا۔
      </p>

      <div className="form-grid">
        <label className="field">
          <span className="field-label">امتحان کا نام *</span>
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
          <span className="field-label">امتحان کی قسم *</span>
          <select
            className="field-input"
            name="exam_type"
            required
            value={examType}
            onChange={(e) => setExamType(e.target.value as ExamType)}
          >
            {EXAM_TYPE_IDS.map((t) => (
              <option key={t} value={t}>
                {EXAM_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">امتحان کی تاریخ *</span>
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
        <span className="field-label">مضامین *</span>
        <textarea
          className="field-input field-textarea"
          name="subjects"
          required
          maxLength={1000}
          defaultValue={(exam.subjects ?? []).join("، ")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">
        ہر مضمون 100 نمبر کا ہوگا۔ مضامین کوما (،) سے الگ لکھیں۔ جس
        مضمون کے نمبر درج ہو چکے ہوں، اسے ہٹایا نہیں جا سکتا۔
      </p>

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "ترمیم محفوظ کریں"}
        </button>
        <Link className="btn-ghost" href={`/departments/exams/${exam.id}`}>
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
