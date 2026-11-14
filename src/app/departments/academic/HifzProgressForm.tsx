/**
 * مرحلہ 38 — حفظ کی پیش رفت شامل کرنے کا فارم (کلائنٹ)
 * کامیاب ہو تو اسی صفحے پر رہتا ہے — فہرست تازہ ہو جاتی ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { todayInKarachi } from "@/lib/attendance";
import { HIFZ_KINDS, HIFZ_QUALITIES } from "@/lib/hifz";
import { addHifzProgress } from "@/app/departments/academic/actions";
import { t, type Lang } from "@/i18n/dictionary";

export interface HifzTeacher {
  id: string;
  name: string;
  father_name: string;
  position: string | null;
}

export default function HifzProgressForm({
  studentId,
  teachers,
  lang,
}: {
  studentId: string;
  teachers: HifzTeacher[];
  lang: Lang;
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
    formData.set("lang", lang);
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
    setSuccess(t(lang, "hifz.form.saved"));
    setPortion("");
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "att.form.date")} *</span>
          <input
            className="field-input"
            type="date"
            value={progressDate}
            onChange={(e) => setProgressDate(e.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "col.type")} *</span>
          <select
            className="field-input"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            required
          >
            {HIFZ_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(lang, `hifz.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "hifz.form.portion")} *</span>
          <input
            className="field-input"
            type="text"
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            maxLength={200}
            placeholder={t(lang, "hifz.form.portion_ph")}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "hifz.form.quality")} *</span>
          <select
            className="field-input"
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            required
          >
            {HIFZ_QUALITIES.map((q) => (
              <option key={q} value={q}>
                {t(lang, `hifz.quality.${q}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "hifz.form.listened_by")}</span>
          <select
            className="field-input"
            value={listenedBy}
            onChange={(e) => setListenedBy(e.target.value)}
          >
            <option value="">{t(lang, "hifz.form.no_teacher")}</option>
            {teachers.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.name} — {tr.father_name}
                {tr.position ? ` (${tr.position})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "hifz.form.note")}</span>
          <input
            className="field-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder={t(lang, "hifz.form.note_ph")}
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
          {loading ? t(lang, "common.wait") : t(lang, "hifz.form.save")}
        </button>
      </div>
    </form>
  );
}
