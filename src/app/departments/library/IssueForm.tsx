/**
 * مرحلہ 101 — کتاب دینے کا فارم (کلائنٹ)
 * قسم چنیں (طالبہ / استاد / عملہ) — پھر اسی قسم کے لوگوں کی فہرست آتی ہے۔
 * کامیاب ہونے پر "دی ہوئی کتابیں" والی فہرست پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BORROWER_TYPES,
  BORROWER_TYPE_LABELS,
  type BorrowerRef,
  type BorrowerType,
} from "@/lib/library";

type IssueAction = (
  bookId: string,
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function IssueForm({
  bookId,
  bookTitle,
  today,
  students,
  teachers,
  staff,
  action,
}: {
  bookId: string;
  bookTitle: string;
  today: string;
  students: BorrowerRef[];
  teachers: BorrowerRef[];
  staff: BorrowerRef[];
  action: IssueAction;
}) {
  const router = useRouter();
  const [borrowerType, setBorrowerType] = useState<BorrowerType>("student");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const people =
    borrowerType === "student"
      ? students
      : borrowerType === "teacher"
        ? teachers
        : staff;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(bookId, formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/departments/library/issues");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">کتاب دیں — {bookTitle}</h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">لینے والا کون ہے؟ *</span>
          <select
            className="field-input"
            name="borrower_type"
            value={borrowerType}
            onChange={(e) =>
              setBorrowerType(e.target.value as BorrowerType)
            }
          >
            {BORROWER_TYPES.map((t) => (
              <option key={t} value={t}>
                {BORROWER_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">نام چنیں *</span>
          <select className="field-input" name="borrower_id" required>
            <option value="">— منتخب کریں —</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.detail ? ` — ${p.detail}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">دینے کی تاریخ *</span>
          <input
            className="field-input"
            type="date"
            name="issued_at"
            defaultValue={today}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">واپسی کی متوقع تاریخ (اختیاری)</span>
          <input className="field-input" type="date" name="due_date" />
        </label>
      </div>

      {people.length === 0 ? (
        <p className="empty-state">
          اس قسم کا کوئی فعال ریکارڈ نہیں ہے — پہلے {BORROWER_TYPE_LABELS[borrowerType] === "طالبہ" ? "طلبہ کے ریکارڈ" : BORROWER_TYPE_LABELS[borrowerType] === "استاد" ? "اساتذہ کے ریکارڈ" : "عملے کے ریکارڈ"} میں شامل کریں۔
        </p>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button
          className="btn-primary"
          type="submit"
          disabled={loading || people.length === 0}
        >
          {loading ? "براہِ کرم انتظار کریں…" : "کتاب دیں"}
        </button>
      </div>
    </form>
  );
}
