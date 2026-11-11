/**
 * مرحلہ 50 — تنخواہ دینے کا فارم (کلائنٹ)
 * شخص چنتے ہی رقم اس کی مقررہ تنخواہ سے خودکار بھر جاتی ہے — بدلی
 * جا سکتی ہے۔ محفوظ ہونے پر اسی ادائیگی کے تفصیل والے صفحے پر جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/fees";
import {
  type SalaryPerson,
  type SalaryPersonType,
} from "@/lib/salaries";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id?: string } | { error: string }>;

export default function SalaryPaymentForm({
  action,
  persons,
  initialPerson,
  initialMonth,
}: {
  action: FormAction;
  persons: SalaryPerson[];
  initialPerson: string;
  initialMonth: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(initialPerson);
  const [amount, setAmount] = useState(() => {
    const p = persons.find(
      (x) => `${x.type}:${x.id}` === initialPerson,
    );
    return p?.monthly_salary ? String(p.monthly_salary) : "";
  });

  const teachers = persons.filter((p) => p.type === "teacher");
  const staff = persons.filter((p) => p.type === "staff");

  function onPersonChange(value: string) {
    setSelectedPerson(value);
    const p = persons.find((x) => `${x.type}:${x.id}` === value);
    if (p?.monthly_salary) setAmount(String(p.monthly_salary));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const [personType, personId] = selectedPerson.split(":");
    formData.set("person_type", personType as SalaryPersonType);
    formData.set("person_id", personId);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(`/departments/salaries/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">شخص *</span>
          <select
            className="field-input"
            value={selectedPerson}
            onChange={(e) => onPersonChange(e.target.value)}
            required
          >
            <option value="">— منتخب کریں —</option>
            <optgroup label="اساتذہ">
              {teachers.map((p) => (
                <option key={p.id} value={`teacher:${p.id}`}>
                  {p.name}
                  {p.monthly_salary
                    ? ` — مقررہ ${p.monthly_salary.toLocaleString("ur-PK")} روپے`
                    : " — مقررہ طے نہیں"}
                </option>
              ))}
            </optgroup>
            <optgroup label="عملہ">
              {staff.map((p) => (
                <option key={p.id} value={`staff:${p.id}`}>
                  {p.name}
                  {p.monthly_salary
                    ? ` — مقررہ ${p.monthly_salary.toLocaleString("ur-PK")} روپے`
                    : " — مقررہ طے نہیں"}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <label className="field">
          <span className="field-label">تنخواہ کا مہینہ *</span>
          <input
            className="field-input"
            name="salary_month"
            type="month"
            required
            defaultValue={initialMonth}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="مثلاً 20000"
          />
        </label>

        <label className="field">
          <span className="field-label">ادائیگی کی تاریخ *</span>
          <input
            className="field-input"
            name="payment_date"
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
          placeholder="مثلاً تنخواہ کے ساتھ کچھ اور"
        />
      </label>

      <p className="sub">
        تنخواہ دیتے ہی اخراجات میں خودکار واؤچر بن جائے گا — بیلنس اور
        ماہانہ حساب میں یہ رقم خودبخود شامل ہو جائے گی۔
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "محفوظ کریں"}
        </button>
        <Link className="btn-ghost" href="/departments/salaries">
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
