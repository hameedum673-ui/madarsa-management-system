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
  type Notice,
} from "@/lib/notices";
import { todayInKarachi } from "@/lib/attendance";
import { t, type Lang } from "@/i18n/dictionary";

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
  lang = "ur",
}: {
  notice?: Notice;
  action: FormAction;
  detailId?: string;
  lang?: Lang;
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
      <input type="hidden" name="lang" value={lang} />
      <h3 className="form-section-title">
        {isEdit ? t(lang, "notice.form.edit_title") : t(lang, "notices.new")}
      </h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "notice.form.title")}</span>
          <input
            className="field-input"
            name="title"
            defaultValue={notice?.title ?? ""}
            placeholder={t(lang, "notice.form.title_ph")}
            required
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "notice.form.kind")}</span>
          <select
            className="field-input"
            name="kind"
            defaultValue={notice?.kind ?? "notice"}
          >
            {NOTICE_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(lang, `notice.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "notice.form.date")}</span>
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
            <span className="field-label">{t(lang, "notice.form.status")}</span>
            <select
              className="field-input"
              name="status"
              defaultValue={notice?.status ?? "active"}
            >
              <option value="active">{t(lang, "library.status.active")}</option>
              <option value="archived">{t(lang, "library.status.archived")}</option>
            </select>
          </label>
        ) : null}

        <label className="field field-wide">
          <span className="field-label">{t(lang, "notice.form.body")}</span>
          <textarea
            className="field-input"
            name="body"
            rows={4}
            defaultValue={notice?.body ?? ""}
            placeholder={t(lang, "notice.form.body_ph")}
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
              : t(lang, "notice.form.save_new")}
        </button>
      </div>
    </form>
  );
}
