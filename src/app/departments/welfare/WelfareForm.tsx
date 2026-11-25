/**
 * مرحلہ 21 — فلاحی کام کا فارم (نیا اندراج؛ کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import type { Student } from "@/lib/students";
import { WELFARE_KINDS } from "@/lib/welfare";
import { PAYMENT_METHODS } from "@/lib/fees";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function WelfareForm({
  students,
  action,
  lang,
}: {
  students: Student[];
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
    // مرحلہ 120 — چھپا ہوا خانہ: سرور کو زبان بتاتا ہے
    formData.set("lang", lang);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    if (res.id) {
      router.push(`/departments/welfare/${res.id}`);
    } else {
      router.push("/departments/welfare");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "welfare.form.student")}</span>
          <select className="field-input" name="student_id" required>
            <option value="">{t(lang, "library.issue_form.select")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.father_name}
                {s.class_name ? ` (${s.class_name})` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "welfare.form.kind")}</span>
          <select className="field-input" name="kind" required>
            {WELFARE_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(lang, `welfare.kind.${k}`)}
              </option>
            ))}
          </select>
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
            placeholder={t(lang, "welfare.form.amount_ph")}
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
        <span className="field-label">{t(lang, "funds.form.note")}</span>
        <textarea
          className="field-input"
          name="note"
          rows={2}
          maxLength={500}
          placeholder={t(lang, "welfare.form.note_ph")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "common.save")}
        </button>
        <Link className="btn-ghost" href="/departments/welfare">
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
