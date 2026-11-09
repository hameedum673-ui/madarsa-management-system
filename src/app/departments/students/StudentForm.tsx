/**
 * مرحلہ 4 — طالبہ کا فارم (نئی طالبہ / تبدیلی، دونوں کے لیے ایک ہی فارم)
 * اردو RTL، موبائل پر آسان۔ رجسٹریشن نمبر سرور خود لگاتا ہے، یہاں نہیں پوچھا جاتا۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
  STUDENT_STATUS_LABELS,
  type Student,
} from "@/lib/students";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function StudentForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  showStatus,
}: {
  initial?: Partial<Student>;
  action: FormAction;
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
}) {
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
    router.push("/departments/students");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">طالبہ کا نام *</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.name ?? ""}
            placeholder="مثلاً فاطمہ"
          />
        </label>

        <label className="field">
          <span className="field-label">والد کا نام *</span>
          <input
            className="field-input"
            name="father_name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.father_name ?? ""}
            placeholder="مثلاً محمد احمد"
          />
        </label>

        <label className="field">
          <span className="field-label">شعبہ *</span>
          <select
            className="field-input"
            name="department"
            required
            defaultValue={initial?.department ?? "hifz"}
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
            defaultValue={initial?.class_name ?? ""}
            placeholder="مثلاً درجہ اول"
          />
        </label>

        <label className="field">
          <span className="field-label">داخلہ کی تاریخ *</span>
          <input
            className="field-input"
            name="admission_date"
            type="date"
            required
            defaultValue={initial?.admission_date ?? today}
          />
        </label>

        <label className="field">
          <span className="field-label">تاریخِ پیدائش</span>
          <input
            className="field-input"
            name="date_of_birth"
            type="date"
            defaultValue={initial?.date_of_birth ?? ""}
          />
        </label>

        <label className="field">
          <span className="field-label">سرپرست کا نام</span>
          <input
            className="field-input"
            name="guardian_name"
            type="text"
            maxLength={100}
            defaultValue={initial?.guardian_name ?? ""}
            placeholder="مثلاً والدہ یا ولی"
          />
        </label>

        <label className="field">
          <span className="field-label">سرپرست کا فون</span>
          <input
            className="field-input"
            name="guardian_phone"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial?.guardian_phone ?? ""}
            placeholder="03xx-xxxxxxx"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">پتہ</span>
        <textarea
          className="field-input field-textarea"
          name="address"
          maxLength={500}
          defaultValue={initial?.address ?? ""}
          placeholder="مکمل پتہ"
        />
      </label>

      {showStatus ? (
        <label className="field">
          <span className="field-label">حالت</span>
          <select
            className="field-input"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">{STUDENT_STATUS_LABELS.active}</option>
            <option value="withdrawn">{STUDENT_STATUS_LABELS.withdrawn}</option>
          </select>
        </label>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">رجسٹریشن نمبر خودکار طور پر لگے گا۔</p>

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : submitLabel}
        </button>
        <Link className="btn-ghost" href={cancelHref}>
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
