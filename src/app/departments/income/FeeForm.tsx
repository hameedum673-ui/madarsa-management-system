/**
 * مرحلہ 8 — فیس درج کرنے کا فارم (کلائنٹ)
 * کامیاب ہو تو رسید والے صفحے پر لے جاتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_METHODS } from "@/lib/fees";
import { t, type Lang } from "@/i18n/dictionary";
import { currentMonthInKarachi } from "@/lib/fees";
import { addFeePayment } from "@/app/departments/income/actions";
import {
  feeForStudent,
  type FeeScheduleEntry,
} from "@/lib/feeSchedule";
import type { DepartmentId } from "@/lib/students";

export interface FeeStudent {
  id: string;
  name: string;
  father_name: string;
  registration_number: string;
  class_name: string | null;
  department: DepartmentId;
}

export default function FeeForm({
  students,
  schedule = [],
  lang,
}: {
  students: FeeStudent[];
  schedule?: FeeScheduleEntry[];
  lang: Lang;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState("");
  const [feeMonth, setFeeMonth] = useState(currentMonthInKarachi());
  const [amount, setAmount] = useState("");
  // مرحلہ 37 — رقم طے شدہ فیس سے بھری گئی ہو تو صارف کو بتایا جائے
  const [amountFromSchedule, setAmountFromSchedule] = useState(false);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toLocaleDateString("en-CA"),
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // مرحلہ 37 — طالبہ چننے پر رقم خود طے شدہ فیس سے بھر جائے (بدلی جا سکتی ہے)
  function handleStudentChange(id: string) {
    setStudentId(id);
    const student = students.find((s) => s.id === id);
    if (!student) {
      setAmount("");
      setAmountFromSchedule(false);
      return;
    }
    const suggested = feeForStudent(
      schedule,
      student.department,
      student.class_name,
    );
    if (suggested !== null) {
      setAmount(String(suggested));
      setAmountFromSchedule(true);
    } else {
      setAmount("");
      setAmountFromSchedule(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("fee_month", feeMonth);
    formData.set("amount", amount);
    formData.set("payment_date", paymentDate);
    formData.set("payment_method", paymentMethod);
    formData.set("note", note);
    formData.set("lang", lang);
    const res = await addFeePayment(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push(`/departments/income/fees/${res.id}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "fee.form.student")}</span>
          <select
            className="field-input"
            value={studentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            required
          >
            <option value="">{t(lang, "admission.form.pick_placeholder")}</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.father_name}
                {s.class_name ? ` (${s.class_name})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "fee.form.month")}</span>
          <input
            className="field-input"
            type="month"
            value={feeMonth}
            onChange={(e) => setFeeMonth(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "fee.form.amount")}</span>
          <input
            className="field-input"
            type="number"
            min={1}
            max={10000000}
            step={1}
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountFromSchedule(false);
            }}
            placeholder={t(lang, "fee.form.amount_ph")}
            required
          />
          {amountFromSchedule ? (
            <span className="sub">
{t(lang, "fee.form.from_schedule")}
            </span>
          ) : null}
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "fee.form.date")}</span>
          <input
            className="field-input"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "fee.form.method")}</span>
          <select
            className="field-input"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            required
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t(lang, `fee.method.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "fee.form.note")}</span>
          <input
            className="field-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t(lang, "fee.form.note_ph")}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "fee.form.submit")}
        </button>
      </div>
    </form>
  );
}
