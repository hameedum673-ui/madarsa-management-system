/**
 * مرحلہ 24 — مدرسے کا عمومی ریکارڈ بدلنے کا فارم (کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر کامیابی کا پیغام دکھاتا ہے۔
 */
"use client";

import { useState } from "react";
import type { MadrasaProfileFormValues } from "@/lib/madrasaProfile";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (formData: FormData) => Promise<{ ok: true } | { error: string }>;

export default function ProfileForm({
  initial,
  action,
  lang = "ur",
}: {
  initial: MadrasaProfileFormValues;
  action: FormAction;
  lang?: Lang;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "general.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={200}
            defaultValue={initial.name}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "general.form.mohtamim")}</span>
          <input
            className="field-input"
            name="mohtamim_name"
            type="text"
            maxLength={200}
            defaultValue={initial.mohtamim_name}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "general.form.phone")}</span>
          <input
            className="field-input"
            name="phone"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial.phone}
            placeholder="مثلاً 03373248940"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "general.form.whatsapp")}</span>
          <input
            className="field-input"
            name="whatsapp"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial.whatsapp}
            placeholder="مثلاً 03373248940"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "general.form.email")}</span>
          <input
            className="field-input"
            name="email"
            type="email"
            dir="ltr"
            maxLength={200}
            defaultValue={initial.email}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "general.form.year")}</span>
          <input
            className="field-input"
            name="established_year"
            type="number"
            dir="ltr"
            min={1900}
            max={2100}
            defaultValue={initial.established_year}
            placeholder="مثلاً 2010"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "general.form.reg_no")}</span>
          <input
            className="field-input"
            name="registration_no"
            type="text"
            maxLength={100}
            defaultValue={initial.registration_no}
          />
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "general.form.hijri_offset")}
          </span>
          <select
            className="field-input"
            name="hijri_offset"
            defaultValue={String(initial.hijri_offset)}
          >
            <option value="-1">
              {t(lang, "general.hijri_offset.minus1")}
            </option>
            <option value="0">
              {t(lang, "general.hijri_offset.zero")}
            </option>
            <option value="1">
              {t(lang, "general.hijri_offset.plus1")}
            </option>
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">{t(lang, "general.form.address")}</span>
        <textarea
          className="field-input"
          name="address"
          rows={2}
          maxLength={300}
          defaultValue={initial.address}
          placeholder="مثلاً شادی لارج، ضلع بدین، سندھ"
        />
      </label>

      <label className="field">
        <span className="field-label">{t(lang, "general.form.note")}</span>
        <textarea
          className="field-input"
          name="note"
          rows={2}
          maxLength={500}
          defaultValue={initial.note}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="att-success">{t(lang, "general.form.saved")}</p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "general.form.saving") : t(lang, "general.form.save")}
        </button>
      </div>
    </form>
  );
}
