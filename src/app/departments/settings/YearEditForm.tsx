/**
 * تعلیمی سال درست کرنے کا فارم (کلائنٹ) — صرف مالک یا ایڈمن دیکھتا ہے۔
 * نام + شروع کی تاریخ + ختم کی تاریخ پہلے سے بھری ہوئی؛ بدل کر محفوظ کریں۔
 * "موجودہ" ہونا، اندراج اور امتحان نہیں بدلتے۔
 */
"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateAcademicYear } from "@/app/departments/settings/actions";
import { t, type Lang } from "@/i18n/dictionary";
import type { AcademicYear } from "@/lib/academicYears";

export default function YearEditForm({
  lang = "ur",
  year,
}: {
  lang?: Lang;
  year: AcademicYear;
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
    const endDate = String(formData.get("end_date") ?? "").trim();
    if (!label) {
      setError(t(lang, "settings.year.err.label"));
      return;
    }
    if (!startDate || !endDate) {
      setError(t(lang, "settings.year.err.date"));
      return;
    }
    if (startDate >= endDate) {
      setError(t(lang, "settings.year.err.range"));
      return;
    }
    setLoading(true);
    formData.set("lang", lang);
    const result = await updateAcademicYear(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    // سال درست ہو گیا — فہرست والی جگہ پر واپس، نئی قدریں نظر آئیں گی
    router.push("/departments/settings");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">{t(lang, "settings.year.edit_title")}</h3>
      <input type="hidden" name="year_id" value={year.id} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "settings.year.label")}</span>
          <input
            className="field-input"
            type="text"
            name="label"
            defaultValue={year.label}
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
            defaultValue={year.start_date}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "settings.year.end")}</span>
          <input
            className="field-input"
            type="date"
            name="end_date"
            defaultValue={year.end_date}
            required
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "common.save")}
        </button>
        <Link className="btn-ghost" href="/departments/settings">
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
