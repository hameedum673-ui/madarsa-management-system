/**
 * پرانا تعلیمی سال بنانے کا فارم (کلائنٹ) — صرف مالک یا ایڈمن دیکھتا ہے۔
 * سال کا نام (مثلاً 1446ھ) اور شروع کی تاریخ (10 شوال کی عیسوی تاریخ)۔
 * موجودہ سال سے فرق: یہ سال موجودہ نہیں بنتا اور موجودہ سال ہو تب بھی
 * بن جاتا ہے؛ اس میں کوئی طالبہ خود نہیں ڈالی جاتی۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPastAcademicYear } from "@/app/departments/settings/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function PastAcademicYearForm({ lang = "ur" }: { lang?: Lang }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setDone(false);
    const formData = new FormData(ev.currentTarget);
    const label = String(formData.get("label") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "").trim();
    if (!label) {
      setError(t(lang, "settings.year.err.label"));
      return;
    }
    if (!startDate) {
      setError(t(lang, "settings.year.err.date"));
      return;
    }
    setLoading(true);
    formData.set("lang", lang);
    const result = await createPastAcademicYear(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // پرانا سال بن گیا — صفحہ تازہ ہو تو سالوں کی فہرست میں نظر آئے گا
    setDone(true);
    ev.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="sub">{t(lang, "settings.year.past_note")}</p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "settings.year.label")}</span>
          <input
            className="field-input"
            type="text"
            name="label"
            placeholder={t(lang, "settings.year.past_label_ph")}
            maxLength={20}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "settings.year.start")}</span>
          <input
            className="field-input"
            type="date"
            name="start_date"
            required
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {done ? <p className="sub">{t(lang, "settings.year.past_created")}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "settings.year.past_create")}
        </button>
      </div>
    </form>
  );
}
