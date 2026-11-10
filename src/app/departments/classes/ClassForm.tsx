/**
 * مرحلہ 14 — جماعت کا فارم (نئی جماعت / تبدیلی، دونوں کے لیے ایک ہی فارم)
 * اردو RTL، موبائل پر آسان۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEPARTMENT_IDS, DEPARTMENT_LABELS } from "@/lib/students";
import { CLASS_STATUS_LABELS, type MadrasaClass } from "@/lib/classes";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function ClassForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  showStatus,
}: {
  initial?: Partial<MadrasaClass>;
  action: FormAction;
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
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
    router.push("/departments/classes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">جماعت کا نام *</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.name ?? ""}
            placeholder="مثلاً درجہ اولیٰ، ناظرہ درجہ اول"
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
          <span className="field-label">ترتیب نمبر *</span>
          <input
            className="field-input"
            name="sort_order"
            type="number"
            dir="ltr"
            required
            min={1}
            max={999}
            defaultValue={initial?.sort_order ?? 1}
          />
        </label>
      </div>

      {showStatus ? (
        <label className="field">
          <span className="field-label">حالت</span>
          <select
            className="field-input"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">{CLASS_STATUS_LABELS.active}</option>
            <option value="inactive">{CLASS_STATUS_LABELS.inactive}</option>
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
