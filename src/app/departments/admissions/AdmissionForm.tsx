/**
 * مرحلہ 9 — داخلہ درخواست کا فارم (نئی درخواست)
 * اردو RTL، موبائل پر آسان۔ حالت «زیرِ غور» سے شروع ہوتی ہے؛
 * منظوری تفصیل والے صفحے سے ہوتی ہے، یہاں نہیں۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClassSelect from "@/components/ClassSelect";
import type { ClassOption } from "@/lib/classes";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
} from "@/lib/students";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id: string } | { error: string }>;

export default function AdmissionForm({
  action,
  classes = [],
}: {
  action: FormAction;
  classes?: ClassOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // مرحلہ 36 — شعبہ بدلنے پر جماعت کی فہرست بھی بدلے
  const [department, setDepartment] = useState("hifz");

  const today = new Date().toISOString().slice(0, 10);

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
    router.push(`/departments/admissions/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">طالبہ کا نام *</span>
          <input
            className="field-input"
            name="applicant_name"
            type="text"
            required
            maxLength={100}
            placeholder="مثلاً فاطمہ"
          />
        </label>

        <label className="field">
          <span className="field-label">والد کا نام *</span>
          <input
            className="field-input"
            name="father_name"
            type="text"
            required
            maxLength={100}
            placeholder="مثلاً محمد احمد"
          />
        </label>

        <label className="field">
          <span className="field-label">شعبہ *</span>
          <select
            className="field-input"
            name="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABELS[d]}
              </option>
            ))}
          </select>
        </label>

        <ClassSelect classes={classes} department={department} />

        <label className="field">
          <span className="field-label">داخلہ کی تاریخ *</span>
          <input
            className="field-input"
            name="admission_date"
            type="date"
            required
            defaultValue={today}
          />
        </label>

        <label className="field">
          <span className="field-label">تاریخِ پیدائش</span>
          <input
            className="field-input"
            name="date_of_birth"
            type="date"
          />
        </label>

        <label className="field">
          <span className="field-label">سرپرست کا نام</span>
          <input
            className="field-input"
            name="guardian_name"
            type="text"
            maxLength={100}
            placeholder="مثلاً والدہ یا ولی"
          />
        </label>

        <label className="field">
          <span className="field-label">رابطہ نمبر</span>
          <input
            className="field-input"
            name="guardian_phone"
            type="tel"
            dir="ltr"
            maxLength={20}
            placeholder="03xx-xxxxxxx"
          />
        </label>

        <label className="field">
          <span className="field-label">واٹس ایپ نمبر</span>
          <input
            className="field-input"
            name="whatsapp_number"
            type="tel"
            dir="ltr"
            maxLength={20}
            placeholder="03xx-xxxxxxx"
          />
        </label>

        <label className="field">
          <span className="field-label">پچھلا مدرسہ (اگر کوئی ہو)</span>
          <input
            className="field-input"
            name="previous_madrasa"
            type="text"
            maxLength={200}
            placeholder="مثلاً —"
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">نوٹ</span>
        <textarea
          className="field-input field-textarea"
          name="note"
          maxLength={500}
          placeholder="کوئی خاص بات ہو تو لکھیں"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">درخواست «زیرِ غور» کے طور پر محفوظ ہوگی؛ منظوری تفصیل والے صفحے سے ہوگی۔</p>

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "درخواست محفوظ کریں"}
        </button>
        <Link className="btn-ghost" href="/departments/admissions">
          منسوخ کریں
        </Link>
      </div>
    </form>
  );
}
