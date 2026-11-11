/**
 * مرحلہ 38 — حفظ کی پیش رفت شامل کرنے کا فارم (کلائنٹ)
 * کامیاب ہو تو اسی صفحے پر رہتا ہے — فہرست تازہ ہو جاتی ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import {
  HIFZ_KINDS,
  HIFZ_KIND_LABELS,
  HIFZ_QUALITIES,
  HIFZ_QUALITY_LABELS,
} from "@/lib/hifz";
import { addHifzProgress } from "@/app/departments/academic/actions";

export interface HifzTeacher {
  id: string;
  name: string;
  father_name: string;
  position: string | null;
}

export default function HifzProgressForm({
  studentId,
  teachers,
}: {
  studentId: string;
  teachers: HifzTeacher[];
}) {
  const router = useRouter();
  const [progressDate, setProgressDate] = useState(todayInKarachi());
  const [kind, setKind] = useState("sabaq");
  const [portion, setPortion] = useState("");
  const [quality, setQuality] = useState("good");
  const [listenedBy, setListenedBy] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const formData = new FormData();
    formData.set("student_id", studentId);
    formData.set("progress_date", progressDate);
    formData.set("kind", kind);
    formData.set("portion", portion);
    formData.set("quality", quality);
    formData.set("listened_by", listenedBy);
    formData.set("note", note);
    const res = await addHifzProgress(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess("پیش رفت محفوظ ہو گئی ہے۔");
    setPortion("");
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">تاریخ *</span>
          <input
            className="field-input"
            type="date"
            value={progressDate}
            onChange={(e) => setProgressDate(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">قسم *</span>
          <select
            className="field-input"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            required
          >
            {HIFZ_KINDS.map((k) => (
              <option key={k} value={k}>
                {HIFZ_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">حصہ *</span>
          <input
            className="field-input"
            type="text"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            maxLength={200}
            placeholder="مثلاً پارہ 5 یا سورۃ یٰسین"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">کیفیت *</span>
          <select
            className="field-input"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            required
          >
            {HIFZ_QUALITIES.map((q) => (
              <option key={q} value={q}>
                {HIFZ_QUALITY_LABELS[q]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">سننے والا استاد</span>
          <select
            className="field-input"
            value={listenedBy}
            onChange={(e) => setListenedBy(e.target.value)}
          >
            <option value="">— کوئی نہیں —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.father_name}
                {t.position ? ` (${t.position})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">نوٹ</span>
          <input
            className="field-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="اختیاری"
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
          {loading ? "براہِ کرم انتظار کریں…" : "پیش رفت محفوظ کریں"}
        </button>
      </div>
    </form>
  );
}
