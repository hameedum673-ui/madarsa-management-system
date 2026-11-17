/**
 * مرحلہ 28 — دستاویز کا فارم (کلائنٹ) — نیا اندراج اور ترمیم دونوں کے لیے
 * اردو RTL، موبائل پر آسان۔ کامیاب ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 * میعاد ختم ہونے کی تاریخ خالی بھی ہو سکتی ہے (ہر دستاویز کی میعاد نہیں ہوتی)۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DOCUMENT_TYPES,
  type MadrasaDocument,
} from "@/lib/documents";
import { todayInKarachi } from "@/lib/attendance";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction =
  | ((formData: FormData) => Promise<{ ok: true } | { error: string }>)
  | ((id: string, formData: FormData) => Promise<{ ok: true } | { error: string }>);
type DocumentAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function DocumentForm({
  document,
  action,
  detailId,
  lang = "ur",
}: {
  document?: MadrasaDocument;
  action: FormAction;
  detailId?: string;
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEdit = !!document;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = isEdit
      ? await (action as (id: string, formData: FormData) => Promise<{ ok: true } | { error: string }>)(
          document.id,
          formData,
        )
      : await (action as DocumentAction)(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(detailId ?? "/departments/documents");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <h3 className="form-section-title">
        {isEdit ? t(lang, "doc.form.edit_title") : t(lang, "docs.new")}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "notice.form.title")}</span>
          <input
            className="field-input"
            name="title"
            defaultValue={document?.title ?? ""}
            placeholder={t(lang, "doc.form.title_ph")}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "notice.form.kind")}</span>
          <select
            className="field-input"
            name="doc_type"
            defaultValue={document?.doc_type ?? "registration"}
          >
            {DOCUMENT_TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {t(lang, `doc.type.${ty}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "doc.form.ref_no")}</span>
          <input
            className="field-input"
            name="reference_no"
            defaultValue={document?.reference_no ?? ""}
            placeholder="مثلاً REG-2024-123"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "doc.form.issued_by")}</span>
          <input
            className="field-input"
            name="issued_by"
            defaultValue={document?.issued_by ?? ""}
            placeholder={t(lang, "doc.form.issued_by_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "doc.form.issue_date")}</span>
          <input
            className="field-input"
            type="date"
            name="issue_date"
            defaultValue={document?.issue_date ?? todayInKarachi()}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "doc.form.expiry_date")}</span>
          <input
            className="field-input"
            type="date"
            name="expiry_date"
            defaultValue={document?.expiry_date ?? ""}
          />
        </label>

        {isEdit ? (
          <label className="field">
            <span className="field-label">{t(lang, "notice.form.status")}</span>
            <select
              className="field-input"
              name="status"
              defaultValue={document?.status ?? "active"}
            >
              <option value="active">{t(lang, "doc.status.active")}</option>
              <option value="expired">{t(lang, "doc.status.expired")}</option>
              <option value="archived">{t(lang, "doc.status.archived")}</option>
            </select>
          </label>
        ) : null}

        <label className="field field-wide">
          <span className="field-label">{t(lang, "doc.form.note")}</span>
          <textarea
            className="field-input"
            name="note"
            rows={3}
            defaultValue={document?.note ?? ""}
            placeholder={t(lang, "doc.form.note_ph")}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? t(lang, "common.waiting")
            : isEdit
              ? t(lang, "general.form.save")
              : t(lang, "doc.form.save_new")}
        </button>
      </div>
    </form>
  );
}
