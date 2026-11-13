/**
 * مرحلہ 86 — اپنی پروفائل بدلنے کا فارم (کلائنٹ)
 * نام + واٹس ایپ نمبر — عہدہ/Gmail/ادارہ نہیں بدلتے (صرف دکھائے جاتے ہیں)۔
 */
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/app/profile/actions";

export default function ProfileForm({
  initialName,
  initialWhatsapp,
}: {
  initialName: string;
  initialWhatsapp: string;
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
      <h3 className="form-section-title">پروفائل بدلیں</h3>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">نام *</span>
          <input
            className="field-input"
            type="text"
            required
            maxLength={100}
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            placeholder="اپنا نام"
          />
        </label>
        <label className="field">
          <span className="field-label">واٹس ایپ نمبر</span>
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
      {saved ? <p className="form-note">پروفائل محفوظ ہو گئی۔</p> : null}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "محفوظ کریں"}
        </button>
      </div>
      <p className="form-note">
        عہدہ، Gmail اور ادارہ نہیں بدلے جا سکتے — وہ صرف دکھائے جاتے ہیں۔
      </p>
    </form>
  );
}
