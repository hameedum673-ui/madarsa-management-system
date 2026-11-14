/**
 * مرحلہ 102 — اپنی زبان چننے کا فارم (کلائنٹ)
 * تینوں آپشن اپنی اپنی زبان میں: اردو / English / العربية۔
 * اردو اور عربی چنے جا سکتے ہیں؛ انگریزی بند ہے ("جلد آ رہا ہے")۔
 * چنتے ہی محفوظ ہو جاتی ہے اور صفحہ نئی زبان میں کھلتا ہے۔
 */
"use client";

import { useState } from "react";
import { setLanguage } from "@/app/profile/actions";
import { LANG_OPTIONS, t, type Lang } from "@/i18n/dictionary";

export default function LanguageForm({
  currentLanguage,
}: {
  currentLanguage: Lang;
}) {
  const [selected, setSelected] = useState<Lang>(currentLanguage);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function choose(lang: Lang) {
    if (lang === selected || loading) return;
    setError("");
    setSaved(false);
    setLoading(true);
    const formData = new FormData();
    formData.set("language", lang);
    const result = await setLanguage(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSelected(lang);
    setSaved(true);
    // پوری سرخی اور ڈیش بورڈ نئی زبان میں کھلے — صفحہ دوبارہ لادیں
    window.location.reload();
  }

  return (
    <form onSubmit={(ev) => ev.preventDefault()}>
      <h3 className="form-section-title">
        {t(currentLanguage, "profile.language")}
      </h3>
      <p className="form-note">
        {t(currentLanguage, "profile.language_note")}
      </p>
      <div
        className="form-grid"
        role="radiogroup"
        aria-label={t(currentLanguage, "profile.language")}
      >
        {LANG_OPTIONS.map((opt) => (
          <label key={opt.id} className="field" style={{ opacity: opt.comingSoon ? 0.6 : 1 }}>
            <span className="field-label" style={{ fontSize: "1.15rem" }}>
              <input
                type="radio"
                name="language"
                value={opt.id}
                checked={selected === opt.id}
                disabled={opt.comingSoon || loading}
                onChange={() => choose(opt.id)}
                style={{ marginInlineEnd: 8 }}
              />
              {opt.label}
              {opt.comingSoon ? (
                <span className="form-note" style={{ marginInlineStart: 6 }}>
                  ({t(currentLanguage, "common.coming_soon")})
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? (
        <p className="form-note">
          {t(currentLanguage, "profile.language_saved")}
        </p>
      ) : null}
      {loading ? (
        <p className="form-note">{t(currentLanguage, "common.wait")}</p>
      ) : null}
    </form>
  );
}
