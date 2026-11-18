/**
 * مرحلہ 86 — اپنی پروفائل بدلنے کا فارم (کلائنٹ)
 * نام + واٹس ایپ نمبر — عہدہ/Gmail/ادارہ نہیں بدلتے (صرف دکھائے جاتے ہیں)۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/app/profile/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function ProfileForm({
  initialName,
  initialWhatsapp,
  lang,
}: {
  initialName: string;
  initialWhatsapp: string;
  lang: Lang;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    setError("");
    setSaved(false);
    setLoading(true);
    const formData = new FormData();
    formData.set("name", name);
    formData.set("whatsapp", whatsapp);
    formData.set("lang", lang);
    const result = await updateMyProfile(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">{t(lang, "profile.edit")}</h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "profile.name")} *</span>
          <input
            className="field-input"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder={t(lang, "profile.name_ph")}
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "profile.whatsapp")}</span>
          <input
            className="field-input"
            type="text"
            maxLength={30}
            value={whatsapp}
            onChange={(ev) => setWhatsapp(ev.target.value)}
            placeholder="مثلاً 03331234567"
            dir="ltr"
          />
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-note">{t(lang, "profile.saved")}</p> : null}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "common.save")}
        </button>
      </div>
      <p className="form-note">{t(lang, "profile.note")}</p>
    </form>
  );
}
