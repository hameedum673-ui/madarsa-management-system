/**
 * مرحلہ 20 — عطیے کا فارم (نیا عطیہ؛ کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ محفوظ ہونے پر تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/fees";
import { DONATION_KINDS, DONATION_KIND_LABELS } from "@/lib/donations";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function DonationForm({ action }: { action: FormAction }) {
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
          <span className="field-label">قسم *</span>
          <select className="field-input" name="kind" required>
            {DONATION_KINDS.map((k) => (
              <option key={k} value={k}>
                {DONATION_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">عطیہ دینے والے کا نام *</span>
          <input
            className="field-input"
            name="donor_name"
            type="text"
            required
            maxLength={100}
            placeholder="مثلاً محمد احمد"
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
            name="donation_date"
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
        <Link className="btn-ghost" href="/departments/donations">
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
