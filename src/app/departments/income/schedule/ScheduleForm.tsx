/**
 * مرحلہ 37 — فیس طے کرنے کا فارم (کلائنٹ)
 * شعبہ + جماعت (خالی = پورا شعبہ) + رقم۔ ایک شعبہ / جماعت کی ایک ہی
 * رقم ہوتی ہے — دوبارہ طے کرنے پر پرانی رقم بدل جاتی ہے۔
 */
"use client";

import { useState } from "react";
import { DEPARTMENT_IDS, DEPARTMENT_LABELS } from "@/lib/students";
import type { ClassOption } from "@/lib/classes";
import { saveFeeSchedule } from "@/app/departments/income/schedule/actions";

export default function ScheduleForm({
  classes,
}: {
  classes: ClassOption[];
}) {
  const [department, setDepartment] = useState("hifz");
  const [className, setClassName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const deptClasses = classes.filter((c) => c.department === department);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const formData = new FormData();
    formData.set("department", department);
    formData.set("class_name", className);
    formData.set("amount", amount);
    const res = await saveFeeSchedule(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess("فیس طے ہو گئی ہے۔");
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">شعبہ *</span>
          <select
            className="field-input"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setClassName("");
            }}
            required
          >
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">جماعت</span>
          <select
            className="field-input"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            <option value="">پورا شعبہ</option>
            {deptClasses.map((c) => (
              <option key={`${c.department}-${c.name}`} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">ماہانہ فیس (روپے) *</span>
          <input
            className="field-input"
            type="number"
            min={1}
            max={10000000}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="مثلاً 1000"
            required
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="form-error" style={{ color: "#1e7d46" }}>
          {success}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "فیس طے کریں"}
        </button>
      </div>
    </form>
  );
}
