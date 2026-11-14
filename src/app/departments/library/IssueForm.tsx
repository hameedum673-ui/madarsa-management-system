/**
 * مرحلہ 101 — کتاب دینے کا فارم (کلائنٹ)
 * قسم چنیں (طالبہ / استاد / عملہ) — پھر اسی قسم کے لوگوں کی فہرست آتی ہے۔
 * کامیاب ہونے پر "دی ہوئی کتابیں" والی فہرست پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import {
  BORROWER_TYPES,
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
  lang,
}: {
  bookId: string;
  bookTitle: string;
  today: string;
  students: BorrowerRef[];
  teachers: BorrowerRef[];
  staff: BorrowerRef[];
  action: IssueAction;
  lang: Lang;
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
      <input type="hidden" name="lang" value={lang} />
      <h3 className="form-section-title">
        {t(lang, "library.issue_title", { title: bookTitle })}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">
            {t(lang, "library.issue_form.borrower_type")}
          </span>
          <select
            className="field-input"
            name="borrower_type"
            value={borrowerType}
            onChange={(e) =>
              setBorrowerType(e.target.value as BorrowerType)
            }
          >
            {BORROWER_TYPES.map((tr) => (
              <option key={tr} value={tr}>
                {t(lang, `library.borrower.${tr}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "library.issue_form.borrower")}
          </span>
          <select className="field-input" name="borrower_id" required>
            <option value="">{t(lang, "library.issue_form.select")}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.detail ? ` — ${p.detail}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "library.issue_form.issued_at")}
          </span>
          <input
            className="field-input"
            type="date"
            name="issued_at"
            defaultValue={today}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "library.issue_form.due_date")}
          </span>
          <input className="field-input" type="date" name="due_date" />
        </label>
      </div>

      {people.length === 0 ? (
        <p className="empty-state">
          {t(lang, `library.issue_form.no_people.${borrowerType}`)}
        </p>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button
          className="btn-primary"
          type="submit"
          disabled={loading || people.length === 0}
        >
          {loading ? t(lang, "common.wait") : t(lang, "library.issue")}
        </button>
      </div>
    </form>
  );
}
