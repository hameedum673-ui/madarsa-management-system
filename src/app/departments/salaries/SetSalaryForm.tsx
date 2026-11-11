/**
 * مرحلہ 50 — مقررہ تنخواہ طے کرنے کا فارم (کلائنٹ)
 * خالی رقم کا مطلب ہے مقررہ تنخواہ ختم۔ محفوظ ہونے پر فہرست پر واپس جاتا ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SalaryPerson } from "@/lib/salaries";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function SetSalaryForm({
  action,
  persons,
  initialPerson,
}: {
  action: FormAction;
  persons: SalaryPerson[];
  initialPerson: string;
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
    setAmount(p?.monthly_salary ? String(p.monthly_salary) : "");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const [personType, personId] = selectedPerson.split(":");
    formData.set("person_type", personType);
    formData.set("person_id", personId);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/departments/salaries");
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
          <span className="field-label">
            ماہانہ مقررہ تنخواہ (روپے) — خالی رکھیں تو ختم ہو جائے گی
          </span>
          <input
            className="field-input"
            name="amount"
            type="number"
            dir="ltr"
            min={1}
            max={10000000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="مثلاً 20000"
          />
        </label>
      </div>

      <p className="sub">
        یہ رقم صرف یہاں نظر آئے گی — اساتذہ یا عملے کے ریکارڈ میں
        تنخواہ کہیں نہیں دکھائی جائے گی۔
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
