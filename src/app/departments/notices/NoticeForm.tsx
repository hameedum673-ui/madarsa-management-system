/**
 * مرحلہ 27 — اطلاع کا فارم (کلائنٹ) — نیا اندراج اور ترمیم دونوں کے لیے
 * اردو RTL، موبائل پر آسان۔ کامیاب ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 * تاریخ مستقبل کی بھی ہو سکتی ہے (تعطیل کی اطلاع پہلے سے دی جاتی ہے)۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  NOTICE_KINDS,
  NOTICE_KIND_LABELS,
  NOTICE_STATUS_LABELS,
  type Notice,
} from "@/lib/notices";
import { todayInKarachi } from "@/lib/attendance";

type FormAction =
  | ((formData: FormData) => Promise<{ ok: true } | { error: string }>)
  | ((id: string, formData: FormData) => Promise<{ ok: true } | { error: string }>);
type NoticeAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function NoticeForm({
  notice,
  action,
  detailId,
}: {
  notice?: Notice;
  action: FormAction;
  detailId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEdit = !!notice;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = isEdit
      ? await (action as (id: string, formData: FormData) => Promise<{ ok: true } | { error: string }>)(
          notice.id,
          formData,
        )
      : await (action as NoticeAction)(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(detailId ?? "/departments/notices");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">
        {isEdit ? "اطلاع تبدیل کریں" : "نئی اطلاع لکھیں"}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">عنوان *</span>
          <input
            className="field-input"
            name="title"
            defaultValue={notice?.title ?? ""}
            placeholder="مثلاً عید کی تعطیلات"
            required
          />
        </label>

        <label className="field">
          <span className="field-label">قسم *</span>
          <select
            className="field-input"
            name="kind"
            defaultValue={notice?.kind ?? "notice"}
          >
            {NOTICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {NOTICE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">تاریخ *</span>
          <input
            className="field-input"
            type="date"
            name="notice_date"
            defaultValue={notice?.notice_date ?? todayInKarachi()}
            required
          />
        </label>

        {isEdit ? (
          <label className="field">
            <span className="field-label">حالت *</span>
            <select
              className="field-input"
              name="status"
              defaultValue={notice?.status ?? "active"}
            >
              <option value="active">{NOTICE_STATUS_LABELS.active}</option>
              <option value="archived">{NOTICE_STATUS_LABELS.archived}</option>
            </select>
          </label>
        ) : null}

        <label className="field field-wide">
          <span className="field-label">تفصیل</span>
          <textarea
            className="field-input"
            name="body"
            rows={4}
            defaultValue={notice?.body ?? ""}
            placeholder="اطلاع کی مکمل تفصیل یہاں لکھیں"
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
              : "اطلاع محفوظ کریں"}
        </button>
      </div>
    </form>
  );
}
