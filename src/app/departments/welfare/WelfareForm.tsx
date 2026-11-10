/**
 * مرحلہ 21 — فلاحی کام کا فارم (نیا اندراج؛ کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import type { Student } from "@/lib/students";
import { WELFARE_KINDS, WELFARE_KIND_LABELS } from "@/lib/welfare";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function WelfareForm({
  students,
  action,
}: {
  students: Student[];
  action: FormAction;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (res.id) {
      router.push(`/departments/welfare/${res.id}`);
    } else {
      router.push("/departments/welfare");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">طالبہ *</span>
          <select className="field-input" name="student_id" required>
            <option value="">— منتخب کریں —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.father_name}
                {s.class_name ? ` (${s.class_name})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">قسم *</span>
          <select className="field-input" name="kind" required>
            {WELFARE_KINDS.map((k) => (
              <option key={k} value={k}>
                {WELFARE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">رقم (روپے) *</span>
          <input
            className="field-input"
            name="amount"
            type="number"
            dir="ltr"
            required
            min={1}
            max={10000000}
            placeholder="مثلاً 2000"
          />
        </label>

        <label className="field">
          <span className="field-label">تاریخ *</span>
          <input
            className="field-input"
            name="record_date"
            type="date"
            required
            defaultValue={todayInKarachi()}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">نوٹ (اگر کوئی ہو)</span>
        <textarea
          className="field-input"
          name="note"
          rows={2}
          maxLength={500}
          placeholder="مثلاً کس مہینے کا وظیفہ ہے"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "محفوظ کریں"}
        </button>
        <Link className="btn-ghost" href="/departments/welfare">
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
