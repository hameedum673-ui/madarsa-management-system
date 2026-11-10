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
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  type MadrasaDocument,
} from "@/lib/documents";
import { todayInKarachi } from "@/lib/attendance";

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
}: {
  document?: MadrasaDocument;
  action: FormAction;
  detailId?: string;
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
      <h3 className="form-section-title">
        {isEdit ? "دستاویز تبدیل کریں" : "نئی دستاویز درج کریں"}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">عنوان *</span>
          <input
            className="field-input"
            name="title"
            defaultValue={document?.title ?? ""}
            placeholder="مثلاً مدرسے کی رجسٹریشن"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">قسم *</span>
          <select
            className="field-input"
            name="doc_type"
            defaultValue={document?.doc_type ?? "registration"}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">حوالہ نمبر</span>
          <input
            className="field-input"
            name="reference_no"
            defaultValue={document?.reference_no ?? ""}
            placeholder="مثلاً REG-2024-123"
          />
        </label>

        <label className="field">
          <span className="field-label">جاری کرنے والا ادارہ</span>
          <input
            className="field-input"
            name="issued_by"
            defaultValue={document?.issued_by ?? ""}
            placeholder="مثلاً محکمہ تعلیم"
          />
        </label>

        <label className="field">
          <span className="field-label">جاری ہونے کی تاریخ</span>
          <input
            className="field-input"
            type="date"
            name="issue_date"
            defaultValue={document?.issue_date ?? todayInKarachi()}
          />
        </label>

        <label className="field">
          <span className="field-label">میعاد ختم ہونے کی تاریخ</span>
          <input
            className="field-input"
            type="date"
            name="expiry_date"
            defaultValue={document?.expiry_date ?? ""}
          />
        </label>

        {isEdit ? (
          <label className="field">
            <span className="field-label">حالت *</span>
            <select
              className="field-input"
              name="status"
              defaultValue={document?.status ?? "active"}
            >
              <option value="active">{DOCUMENT_STATUS_LABELS.active}</option>
              <option value="expired">{DOCUMENT_STATUS_LABELS.expired}</option>
              <option value="archived">{DOCUMENT_STATUS_LABELS.archived}</option>
            </select>
          </label>
        ) : null}

        <label className="field field-wide">
          <span className="field-label">نوٹ</span>
          <textarea
            className="field-input"
            name="note"
            rows={3}
            defaultValue={document?.note ?? ""}
            placeholder="دستاویز کے بارے میں کوئی نوٹ"
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? "براہِ کرم انتظار کریں…"
            : isEdit
              ? "تبدیلی محفوظ کریں"
              : "دستاویز محفوظ کریں"}
        </button>
      </div>
    </form>
  );
}
