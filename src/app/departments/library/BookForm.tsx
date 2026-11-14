/**
 * مرحلہ 100 — کتاب کا فارم (کلائنٹ) — نیا اندراج اور ترمیم دونوں کے لیے
 * اردو RTL، موبائل پر آسان۔ کامیاب ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BOOK_CATEGORIES,
  BOOK_CATEGORY_LABELS,
  BOOK_STATUS_LABELS,
  type LibraryBook,
} from "@/lib/library";

type FormAction =
  | ((formData: FormData) => Promise<{ ok: true } | { error: string }>)
  | ((id: string, formData: FormData) => Promise<{ ok: true } | { error: string }>);
type BookAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function BookForm({
  book,
  action,
  detailId,
}: {
  book?: LibraryBook;
  action: FormAction;
  detailId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEdit = !!book;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = isEdit
      ? await (action as (id: string, formData: FormData) => Promise<{ ok: true } | { error: string }>)(
          book.id,
          formData,
        )
      : await (action as BookAction)(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(detailId ?? "/departments/library");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">
        {isEdit ? "کتاب تبدیل کریں" : "نئی کتاب لکھیں"}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">کتاب کا نام *</span>
          <input
            className="field-input"
            name="title"
            defaultValue={book?.title ?? ""}
            placeholder="مثلاً تفسیر ابن کثیر"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">مصنف</span>
          <input
            className="field-input"
            name="author"
            defaultValue={book?.author ?? ""}
            placeholder="مثلاً ابن کثیر"
          />
        </label>

        <label className="field">
          <span className="field-label">قسم *</span>
          <select
            className="field-input"
            name="category"
            defaultValue={book?.category ?? "other"}
          >
            {BOOK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {BOOK_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">تعداد</span>
          <input
            className="field-input"
            type="number"
            name="quantity"
            min={0}
            step={1}
            defaultValue={book?.quantity ?? 1}
          />
        </label>

        <label className="field">
          <span className="field-label">الماری/جگہ</span>
          <input
            className="field-input"
            name="shelf"
            defaultValue={book?.shelf ?? ""}
            placeholder="مثلاً الماری 1"
          />
        </label>

        {isEdit ? (
          <label className="field">
            <span className="field-label">حالت *</span>
            <select
              className="field-input"
              name="status"
              defaultValue={book?.status ?? "active"}
            >
              <option value="active">{BOOK_STATUS_LABELS.active}</option>
              <option value="archived">{BOOK_STATUS_LABELS.archived}</option>
            </select>
          </label>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? "براہِ کرم انتظار کریں…"
            : isEdit
              ? "تبدیلی محفوظ کریں"
              : "کتاب محفوظ کریں"}
        </button>
      </div>
    </form>
  );
}
