/**
 * مرحلہ 13 — عملے کا فارم (نیا عملہ / تبدیلی، دونوں کے لیے ایک ہی فارم)
 * اردو RTL، موبائل پر آسان۔ تنخواہ اس فارم میں نہیں ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
  SECTION_IDS,
  SECTION_LABELS,
  STUDENT_STATUS_LABELS,
} from "@/lib/students";
import type { StaffMember } from "@/lib/staff";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function StaffForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  showStatus,
}: {
  initial?: Partial<StaffMember>;
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
    router.push("/departments/staff");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">عملے کا نام *</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.name ?? ""}
            placeholder="مثلاً محمد علی"
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
          <span className="field-label">شعبہ (بنین / بنات) *</span>
          <select
            className="field-input"
            name="section"
            required
            defaultValue={initial?.section ?? "banat"}
          >
            {SECTION_IDS.map((s) => (
              <option key={s} value={s}>
                {SECTION_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">عہدہ / کام</span>
          <input
            className="field-input"
            name="position"
            type="text"
            maxLength={100}
            defaultValue={initial?.position ?? ""}
            placeholder="مثلاً باورچی، چوکیدار، کلرک"
          />
        </label>

        <label className="field">
          <span className="field-label">تقرری کی تاریخ *</span>
          <input
            className="field-input"
            name="joining_date"
            type="date"
            required
            defaultValue={initial?.joining_date ?? today}
          />
        </label>

        <label className="field">
          <span className="field-label">فون</span>
          <input
            className="field-input"
            name="phone"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial?.phone ?? ""}
            placeholder="03xx-xxxxxxx"
          />
        </label>

        <label className="field">
          <span className="field-label">شناختی کارڈ نمبر</span>
          <input
            className="field-input"
            name="cnic"
            type="text"
            dir="ltr"
            maxLength={15}
            defaultValue={initial?.cnic ?? ""}
            placeholder="xxxxx-xxxxxxx-x"
          />
        </label>

        <label className="field">
          <span className="field-label">تعلیمی قابلیت</span>
          <input
            className="field-input"
            name="qualification"
            type="text"
            maxLength={200}
            defaultValue={initial?.qualification ?? ""}
            placeholder="مثلاً میٹرک، پرائمری"
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
