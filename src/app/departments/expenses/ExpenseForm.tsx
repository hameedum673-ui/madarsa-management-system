/**
 * مرحلہ 16 — خرچ کا فارم (نیا خرچ درج کریں؛ کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر واؤچر والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { t, type Lang } from "@/i18n/dictionary";
import { PAYMENT_METHODS } from "@/lib/fees";
import { SECTION_IDS } from "@/lib/students";
import { EXPENSE_CATEGORIES } from "@/lib/expenses";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function ExpenseForm({
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
    formData.set("lang", lang);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    if (res.id) {
      router.push(`/departments/expenses/${res.id}`);
    } else {
      router.push("/departments/expenses");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "expense.form.title")}</span>
          <input
            className="field-input"
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder={t(lang, "expense.form.title_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "expense.form.category")}</span>
          <select className="field-input" name="category" required>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(lang, `exp.cat.${c}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "expense.form.amount")}</span>
          <input
            className="field-input"
            name="amount"
            type="number"
            dir="ltr"
            required
            min={1}
            max={10000000}
            placeholder={t(lang, "expense.form.amount_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "expense.form.date")}</span>
          <input
            className="field-input"
            name="expense_date"
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
        <span className="field-label">{t(lang, "expense.form.section")}</span>
        <select className="field-input" name="section" required defaultValue="banat">
          {SECTION_IDS.map((s) => (
            <option key={s} value={s}>
              {t(lang, `section.${s}`)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">{t(lang, "expense.form.note")}</span>
        <textarea
          className="field-input"
          name="note"
          rows={2}
          maxLength={500}
          placeholder={t(lang, "expense.form.note_ph")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "common.save")}
        </button>
        <Link className="btn-ghost" href="/departments/expenses">
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
