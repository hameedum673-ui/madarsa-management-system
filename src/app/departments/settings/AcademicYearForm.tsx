/**
 * تعلیمی سال شروع کرنے کا فارم (کلائنٹ) — صرف مالک یا ایڈمن دیکھتا ہے۔
 * سال کا نام (مثلاً 1447ھ) اور شروع کی تاریخ (10 شوال کی عیسوی تاریخ)۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAcademicYear } from "@/app/departments/settings/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function AcademicYearForm({
  lang = "ur",
  activeCount,
}: {
  lang?: Lang;
  activeCount: number;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
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
    const result = await createAcademicYear(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // سال بن گیا — صفحہ تازہ ہو تو موجودہ سال والا حصہ نظر آئے گا
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="sub">{t(lang, "settings.year.note")}</p>
      <p className="sub">
        {t(lang, "settings.year.will_create", {
          n: activeCount.toLocaleString("ur-PK"),
        })}
      </p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "settings.year.label")}</span>
          <input
            className="field-input"
            type="text"
            name="label"
            placeholder={t(lang, "settings.year.label_ph")}
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

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "settings.year.create")}
        </button>
      </div>
    </form>
  );
}
