/**
 * CSV درآمد (کلائنٹ) — سال چنیں + فائل اپ لوڈ کریں → پیش نظارہ
 * → تصدیق۔ پیش نظارہ تک کچھ محفوظ نہیں ہوتا؛ تصدیق پر ہی
 * درست قطاریں ڈلتی ہیں۔
 */
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { confirmImport, previewImport, type PreviewResult } from "./actions";
import type { AcademicYear } from "@/lib/academicYears";
import { t, type Lang } from "@/i18n/dictionary";

const VALID_SHOWN = 50;

export default function ImportForm({
  lang = "ur",
  years,
}: {
  lang?: Lang;
  years: AcademicYear[];
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<
    Extract<PreviewResult, { ok: true }> | null
  >(null);
  const [summary, setSummary] = useState<{
    yearLabel: string;
    added: number;
    skipped: { row: number; reason: string }[];
  } | null>(null);

  if (years.length === 0) {
    return <p className="sub">{t(lang, "student.import.no_years")}</p>;
  }

  async function handlePreview(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setPreview(null);
    setSummary(null);
    const formData = new FormData(ev.currentTarget);
    const yearId = String(formData.get("academic_year_id") ?? "").trim();
    if (!yearId) {
      setError(t(lang, "student.past_enroll.err.year"));
      return;
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(t(lang, "student.import.err.no_file"));
      return;
    }
    setLoading(true);
    formData.set("lang", lang);
    const result = await previewImport(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPreview(result);
  }

  async function handleConfirm() {
    if (!preview) return;
    setError("");
    setLoading(true);
    const formData = new FormData();
    formData.set("lang", lang);
    formData.set("academic_year_id", preview.yearId);
    formData.set("rows", JSON.stringify(preview.valid));
    const result = await confirmImport(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSummary({
      yearLabel: result.yearLabel,
      added: result.added,
      skipped: result.skipped,
    });
    setPreview(null);
  }

  if (summary) {
    return (
      <div>
        <p className="sub">
          {t(lang, "student.import.done")} ({summary.yearLabel})
        </p>
        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "student.import.added")}</span>
            <strong>{summary.added.toLocaleString("ur-PK")}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "student.import.skipped")}</span>
            <strong>{summary.skipped.length.toLocaleString("ur-PK")}</strong>
          </div>
        </div>
        {summary.skipped.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t(lang, "student.import.row")}</th>
                <th>{t(lang, "student.import.reason")}</th>
              </tr>
            </thead>
            <tbody>
              {summary.skipped.map((s) => (
                <tr key={s.row}>
                  <td>{s.row.toLocaleString("ur-PK")}</td>
                  <td>{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        <div className="form-actions">
          <Link className="btn-primary" href="/departments/students">
            {t(lang, "module.students")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="sub">{t(lang, "student.import.sub")}</p>
      <p className="sub">{t(lang, "student.import.format")}</p>
      <p>
        <a className="btn-ghost" href="/students-import-sample.csv" download>
          {t(lang, "student.import.sample")}
        </a>
      </p>

      <form onSubmit={handlePreview}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">{t(lang, "student.import.year")}</span>
            <select className="field-input" name="academic_year_id" required>
              <option value="">{t(lang, "student.past_enroll.err.year")}</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                  {year.is_current
                    ? ` — ${t(lang, "settings.year.current")}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t(lang, "student.import.file")}</span>
            <input
              className="field-input"
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
            />
            <span className="sub">{t(lang, "student.import.file_hint")}</span>
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? t(lang, "common.wait") : t(lang, "student.import.preview_btn")}
          </button>
        </div>
      </form>

      {preview ? (
        <div>
          <h3>{t(lang, "student.import.preview_title")}</h3>
          <p className="form-error">{t(lang, "student.import.warning")}</p>
          <div className="detail-rows">
            <div className="row">
              <span>{t(lang, "student.import.year")}</span>
              <strong>{preview.yearLabel}</strong>
            </div>
            <div className="row">
              <span>{t(lang, "student.import.valid")}</span>
              <strong>{preview.valid.length.toLocaleString("ur-PK")}</strong>
            </div>
            <div className="row">
              <span>{t(lang, "student.import.errors")}</span>
              <strong>{preview.errors.length.toLocaleString("ur-PK")}</strong>
            </div>
            <div className="row">
              <span>{t(lang, "student.import.duplicates")}</span>
              <strong>{preview.duplicates.length.toLocaleString("ur-PK")}</strong>
            </div>
          </div>

          {preview.valid.length > 0 ? (
            <div>
              <h4>{t(lang, "student.import.valid")}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t(lang, "student.import.row")}</th>
                    <th>{t(lang, "student.import.name")}</th>
                    <th>{t(lang, "student.import.father")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.valid.slice(0, VALID_SHOWN).map((r) => (
                    <tr key={r.row}>
                      <td>{r.row.toLocaleString("ur-PK")}</td>
                      <td>{r.name}</td>
                      <td>{r.fatherName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.valid.length > VALID_SHOWN ? (
                <p className="sub">
                  {t(lang, "student.import.more", {
                    n: String(preview.valid.length - VALID_SHOWN),
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="form-error">{t(lang, "student.import.no_valid")}</p>
          )}

          {preview.errors.length > 0 ? (
            <div>
              <h4>{t(lang, "student.import.errors")}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t(lang, "student.import.row")}</th>
                    <th>{t(lang, "student.import.reason")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.errors.map((e) => (
                    <tr key={e.row}>
                      <td>{e.row.toLocaleString("ur-PK")}</td>
                      <td>{e.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {preview.duplicates.length > 0 ? (
            <div>
              <h4>{t(lang, "student.import.duplicates")}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t(lang, "student.import.row")}</th>
                    <th>{t(lang, "student.import.name")}</th>
                    <th>{t(lang, "student.import.father")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.duplicates.map((d) => (
                    <tr key={d.row}>
                      <td>{d.row.toLocaleString("ur-PK")}</td>
                      <td>{d.name}</td>
                      <td>{d.fatherName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}
          <div className="form-actions">
            <button
              className="btn-primary"
              type="button"
              onClick={handleConfirm}
              disabled={loading || preview.valid.length === 0}
            >
              {loading ? t(lang, "common.wait") : t(lang, "student.import.confirm")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
