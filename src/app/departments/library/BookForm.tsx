/**
 * مرحلہ 100 — کتاب کا فارم (کلائنٹ) — نیا اندراج اور ترمیم دونوں کے لیے
 * اردو RTL، موبائل پر آسان۔ کامیاب ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import {
  BOOK_CATEGORIES,
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
  lang,
}: {
  book?: LibraryBook;
  action: FormAction;
  detailId?: string;
  lang: Lang;
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
      <input type="hidden" name="lang" value={lang} />
      <h3 className="form-section-title">
        {isEdit
          ? t(lang, "library.form.edit_title")
          : t(lang, "library.add")}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "library.form.title")}</span>
          <input
            className="field-input"
            name="title"
            defaultValue={book?.title ?? ""}
            placeholder={t(lang, "library.form.title_ph")}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "library.form.author")}
          </span>
          <input
            className="field-input"
            name="author"
            defaultValue={book?.author ?? ""}
            placeholder={t(lang, "library.form.author_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "library.form.category")}
          </span>
          <select
            className="field-input"
            name="category"
            defaultValue={book?.category ?? "other"}
          >
            {BOOK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(lang, `library.cat.${c}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "library.form.quantity")}
          </span>
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
          <span className="field-label">
            {t(lang, "library.form.shelf")}
          </span>
          <input
            className="field-input"
            name="shelf"
            defaultValue={book?.shelf ?? ""}
            placeholder={t(lang, "library.form.shelf_ph")}
          />
        </label>

        {isEdit ? (
          <label className="field">
            <span className="field-label">
              {t(lang, "library.form.status")}
            </span>
            <select
              className="field-input"
              name="status"
              defaultValue={book?.status ?? "active"}
            >
              <option value="active">
                {t(lang, "library.status.active")}
              </option>
              <option value="archived">
                {t(lang, "library.status.archived")}
              </option>
            </select>
          </label>
        ) : null}
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? t(lang, "common.wait")
            : isEdit
              ? t(lang, "student.form.update")
              : t(lang, "library.form.save")}
        </button>
      </div>
    </form>
  );
}
