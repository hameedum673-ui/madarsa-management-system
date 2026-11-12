/**
 * مرحلہ 19 — زکوٰۃ کا فارم (نیا اندراج؛ کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/fees";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/students";
/* مرحلہ 49 — "قسم" والا ڈبہ ختم: ہر نیا اندراج خودکار طور پر "وصولی" ہے */

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function ZakatForm({ action }: { action: FormAction }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    if (res.id) {
      router.push(`/departments/zakat/${res.id}`);
    } else {
      router.push("/departments/zakat");
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">نام *</span>
          <input
            className="field-input"
            name="person_name"
            type="text"
            required
            maxLength={100}
            placeholder="دینے والے / لینے والے کا نام"
          />
        </label>

        <label className="field">
          <span className="field-label">رقم (روپے) *</span>
          <input
            className="field-input"
            name="amount"
            type="number"
            dir="ltr"
            required
            min={1}
            max={10000000}
            placeholder="مثلاً 5000"
          />
        </label>

        <label className="field">
          <span className="field-label">تاریخ *</span>
          <input
            className="field-input"
            name="record_date"
            type="date"
            required
            defaultValue={todayInKarachi()}
          />
        </label>

        <label className="field">
          <span className="field-label">ادائیگی کا طریقہ *</span>
          <select className="field-input" name="payment_method" required>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="field-label">شعبہ (بنین / بنات) *</span>
        <select className="field-input" name="section" required defaultValue="banat">
          {SECTION_IDS.map((s) => (
            <option key={s} value={s}>
              {SECTION_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">نوٹ (اگر کوئی ہو)</span>
        <textarea
          className="field-input"
          name="note"
          rows={2}
          maxLength={500}
          placeholder="مثلاً کس مقصد کے لیے"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "محفوظ کریں"}
        </button>
        <Link className="btn-ghost" href="/departments/zakat">
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
