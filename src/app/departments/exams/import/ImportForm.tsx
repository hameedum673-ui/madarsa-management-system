/**
 * CSV درآمد — نمبر ایک ساتھ (کلائنٹ)
 * امتحان چنیں + فائل اپ لوڈ کریں → پیش نظارہ → تصدیق۔
 * پیش نظارہ تک کچھ محفوظ نہیں ہوتا؛ تصدیق پر ہی نمبر ڈلتے ہیں۔
 */
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  confirmMarksImport,
  previewMarksImport,
  type PreviewResult,
} from "./actions";
import type { ImportExam } from "./page";
import { t, type Lang } from "@/i18n/dictionary";

const VALID_SHOWN = 50;

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default function ImportForm({
  lang = "ur",
  exams,
}: {
  lang?: Lang;
  exams: ImportExam[];
}) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<
    Extract<PreviewResult, { ok: true }> | null
  >(null);
  const [summary, setSummary] = useState<{
    examId: string;
    examName: string;
    added: number;
    skipped: { row: number; reason: string }[];
  } | null>(null);

  if (exams.length === 0) {
    return <p className="sub">{t(lang, "exam.marks_import.no_exams")}</p>;
  }

  async function handlePreview(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setError("");
    setPreview(null);
    setSummary(null);
    const formData = new FormData(ev.currentTarget);
    const examId = String(formData.get("exam_id") ?? "").trim();
    if (!examId) {
      setError(t(lang, "exam.marks_import.err.exam"));
      return;
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError(t(lang, "exam.marks_import.err.no_file"));
      return;
    }
    setLoading(true);
    formData.set("lang", lang);
    const result = await previewMarksImport(formData);
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
    formData.set("exam_id", preview.examId);
    formData.set("rows", JSON.stringify(preview.valid));
    const result = await confirmMarksImport(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setSummary({
      examId: result.examId,
      examName: result.examName,
      added: result.added,
      skipped: result.skipped,
    });
    setPreview(null);
  }

  if (summary) {
    return (
      <div>
        <p className="sub">
          {t(lang, "exam.marks_import.done")} ({summary.examName})
        </p>
        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "exam.marks_import.added")}</span>
            <strong>{summary.added.toLocaleString("ur-PK")}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "exam.marks_import.skipped")}</span>
            <strong>{summary.skipped.length.toLocaleString("ur-PK")}</strong>
          </div>
        </div>
        {summary.skipped.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>{t(lang, "exam.marks_import.row")}</th>
                <th>{t(lang, "exam.marks_import.reason")}</th>
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
          <Link
            className="btn-primary"
            href={`/departments/exams/${summary.examId}`}
          >
            {t(lang, "exam.detail.results")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="sub">{t(lang, "exam.marks_import.sub")}</p>
      <p className="sub">{t(lang, "exam.marks_import.format")}</p>
      <p>
        <a className="btn-ghost" href="/marks-import-sample.csv" download>
          {t(lang, "exam.marks_import.sample")}
        </a>
      </p>

      <form onSubmit={handlePreview}>
        <div className="form-grid">
          <label className="field">
            <span className="field-label">
              {t(lang, "exam.marks_import.exam")}
            </span>
            <select className="field-input" name="exam_id" required>
              <option value="">
                {t(lang, "exam.marks_import.err.exam")}
              </option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} — {formatDate(exam.exam_date)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">
              {t(lang, "exam.marks_import.file")}
            </span>
            <input
              className="field-input"
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
            />
            <span className="sub">
              {t(lang, "exam.marks_import.file_hint")}
            </span>
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading
              ? t(lang, "common.wait")
              : t(lang, "exam.marks_import.preview_btn")}
          </button>
        </div>
      </form>

      {preview ? (
        <div>
          <h3>{t(lang, "exam.marks_import.preview_title")}</h3>
          <p className="form-error">{t(lang, "exam.marks_import.warning")}</p>
          <div className="detail-rows">
            <div className="row">
              <span>{t(lang, "exam.marks_import.exam")}</span>
              <strong>{preview.examName}</strong>
            </div>
            <div className="row">
              <span>{t(lang, "exam.marks_import.valid")}</span>
              <strong>{preview.valid.length.toLocaleString("ur-PK")}</strong>
            </div>
            <div className="row">
              <span>{t(lang, "exam.marks_import.errors")}</span>
              <strong>{preview.errors.length.toLocaleString("ur-PK")}</strong>
            </div>
            <div className="row">
              <span>{t(lang, "exam.marks_import.already")}</span>
              <strong>{preview.already.length.toLocaleString("ur-PK")}</strong>
            </div>
          </div>

          {preview.valid.length > 0 ? (
            <div>
              <h4>{t(lang, "exam.marks_import.valid")}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t(lang, "exam.marks_import.row")}</th>
                    <th>{t(lang, "exam.marks_import.name")}</th>
                    <th>{t(lang, "exam.marks_import.father")}</th>
                    <th>{t(lang, "exam.marks_import.marks")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.valid.slice(0, VALID_SHOWN).map((r) => (
                    <tr key={r.row}>
                      <td>{r.row.toLocaleString("ur-PK")}</td>
                      <td>{r.name}</td>
                      <td>{r.fatherName}</td>
                      <td>
                        {r.marks
                          .map(
                            (m) =>
                              `${m.subject}: ${m.marks.toLocaleString("ur-PK")}`,
                          )
                          .join("، ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.valid.length > VALID_SHOWN ? (
                <p className="sub">
                  {t(lang, "exam.marks_import.more", {
                    n: String(preview.valid.length - VALID_SHOWN),
                  })}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="form-error">
              {t(lang, "exam.marks_import.no_valid")}
            </p>
          )}

          {preview.errors.length > 0 ? (
            <div>
              <h4>{t(lang, "exam.marks_import.errors")}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t(lang, "exam.marks_import.row")}</th>
                    <th>{t(lang, "exam.marks_import.reason")}</th>
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

          {preview.already.length > 0 ? (
            <div>
              <h4>{t(lang, "exam.marks_import.already")}</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t(lang, "exam.marks_import.row")}</th>
                    <th>{t(lang, "exam.marks_import.name")}</th>
                    <th>{t(lang, "exam.marks_import.father")}</th>
                    <th>{t(lang, "exam.marks_import.subjects")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.already.map((a) => (
                    <tr key={a.row}>
                      <td>{a.row.toLocaleString("ur-PK")}</td>
                      <td>{a.name}</td>
                      <td>{a.fatherName}</td>
                      <td>{a.subjects.join("، ")}</td>
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
              {loading
                ? t(lang, "common.wait")
                : t(lang, "exam.marks_import.confirm")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
