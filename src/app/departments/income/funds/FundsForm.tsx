/**
 * مرحلہ 49 — ملا ہوا اندراج فارم (کلائنٹ)
 * ایک ہی فارم سے زکوٰۃ، عشر یا عطیات درج ہوتے ہیں — "مد" والا ڈبہ
 * بتاتا ہے کہ پیسہ کس مد میں دے رہا ہے (ادائیگی کے طریقے والا ڈبہ جیسا)۔
 * محفوظ ہونے پر اسی مد کے تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS } from "@/lib/fees";
import { SECTION_IDS } from "@/lib/students";
import { type FundCategory } from "@/lib/funds";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; href: string } | { error: string }>;

export default function FundsForm({
  action,
  allowedFunds,
  lang,
}: {
  action: FormAction;
  allowedFunds: FundCategory[];
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
    formData.set("lang", lang);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(res.href);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "funds.form.fund")}</span>
          <select className="field-input" name="fund" required>
            {allowedFunds.map((f) => (
              <option key={f} value={f}>
{t(lang, `fund.cat.${f}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "funds.form.name")}</span>
          <input
            className="field-input"
            name="person_name"
            type="text"
            required
            maxLength={100}
            placeholder={t(lang, "funds.form.name_ph")}
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
            name="record_date"
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
        <Link className="btn-ghost" href="/departments/income/funds">
{t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
