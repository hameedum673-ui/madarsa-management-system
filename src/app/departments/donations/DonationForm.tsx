/**
 * مرحلہ 20 — عطیے کا فارم (نیا عطیہ؛ کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS } from "@/lib/fees";
import { SECTION_IDS } from "@/lib/students";
import { DONATION_KINDS } from "@/lib/donations";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function DonationForm({
  action,
  lang,
}: {
  action: FormAction;
  lang: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    // مرحلہ 119 — چھپا ہوا خانہ: سرور کو زبان بتاتا ہے
    formData.set("lang", lang);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    if (res.id) {
      router.push(`/departments/donations/${res.id}`);
    } else {
      router.push("/departments/donations");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">
            {t(lang, "donations.form.kind")}
          </span>
          <select className="field-input" name="kind" required>
            {DONATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(lang, `monthly.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">
            {t(lang, "donations.form.donor_name")}
          </span>
          <input
            className="field-input"
            name="donor_name"
            type="text"
            required
            maxLength={100}
            placeholder={t(lang, "donations.form.donor_name_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "fee.form.amount")}</span>
          <input
            className="field-input"
            name="amount"
            type="number"
            dir="ltr"
            required
            min={1}
            max={10000000}
            placeholder={t(lang, "funds.form.amount_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "funds.form.date")}</span>
          <input
            className="field-input"
            name="donation_date"
            type="date"
            required
            defaultValue={todayInKarachi()}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "fee.form.method")}</span>
          <select className="field-input" name="payment_method" required>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(lang, `fee.method.${m}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">{t(lang, "funds.form.section")}</span>
        <select className="field-input" name="section" required defaultValue="banat">
          {SECTION_IDS.map((s) => (
            <option key={s} value={s}>
              {t(lang, `section.${s}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">{t(lang, "funds.form.note")}</span>
        <textarea
          className="field-input"
          name="note"
          rows={2}
          maxLength={500}
          placeholder={t(lang, "funds.form.note_ph")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "common.save")}
        </button>
        <Link className="btn-ghost" href="/departments/donations">
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
