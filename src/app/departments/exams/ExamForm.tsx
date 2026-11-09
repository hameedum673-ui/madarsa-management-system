/**
 * مرحلہ 10 — نیا امتحان بنانے کا فارم
 * مضامین کوما سے الگ لکھیں — اردو کوما (،) اور انگریزی کوما (,) دونوں چلتے ہیں۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
} from "@/lib/students";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id: string } | { error: string }>;

export default function ExamForm({ action }: { action: FormAction }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      <div className="form-grid">
        <label className="field">
          <span className="field-label">امتحان کا نام *</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={200}
            placeholder="مثلاً پہلا سہ ماہی امتحان"
          />
        </label>

        <label className="field">
          <span className="field-label">امتحان کی تاریخ *</span>
          <input
            className="field-input"
            name="exam_date"
            type="date"
            required
            defaultValue={today}
          />
        </label>

        <label className="field">
          <span className="field-label">شعبہ *</span>
          <select
            className="field-input"
            name="department"
            required
            defaultValue="hifz"
          >
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">جماعت</span>
          <input
            className="field-input"
            name="class_name"
            type="text"
            maxLength={100}
            placeholder="مثلاً درجہ اول (خالی ہو تو پورا شعبہ)"
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
          placeholder="مثلاً ناظرہ، تجوید، اردو"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">
        ہر مضمون 100 نمبر کا ہوگا۔ مضامین کوما (،) سے الگ لکھیں۔
      </p>

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "امتحان بنائیں"}
        </button>
        <Link className="btn-ghost" href="/departments/exams">
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
