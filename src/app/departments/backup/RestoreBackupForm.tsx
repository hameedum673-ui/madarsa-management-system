/**
 * مرحلہ 42 — بیک اپ واپس لانے کا فارم (کلائنٹ)
 * پہلے جائزہ (فائل میں کون سی میز میں کتنے ریکارڈ ہیں)، پھر دو مرحلوں
 * والی تصدیق، پھر بحال ہونے کے بعد رپورٹ۔
 */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { restoreBackup } from "@/app/departments/backup/actions";
import { RESTORE_TABLES, type RestoreTableReport } from "@/lib/restore";
import { t, type Lang } from "@/i18n/dictionary";

interface PreviewRow {
  table: string;
  count: number;
}

export default function RestoreBackupForm({ lang = "ur" }: { lang?: Lang }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<RestoreTableReport[] | null>(null);

  function readFile(f: File): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(String(reader.result)));
        } catch {
          reject(new Error("json"));
        }
      };
      reader.onerror = () => reject(new Error("read"));
      reader.readAsText(f);
    });
  }

  async function handlePreview() {
    setError("");
    setPreview(null);
    setReport(null);
    setConfirming(false);
    const f = inputRef.current?.files?.[0] ?? null;
    if (!f) {
      setError(t(lang, "backup.err.choose_first"));
      return;
    }
    let parsed: unknown;
    try {
      parsed = await readFile(f);
    } catch {
      setError(t(lang, "backup.err.not_json"));
      return;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { app?: unknown }).app !== "madrasa-management-system" ||
      typeof (parsed as { tables?: unknown }).tables !== "object" ||
      (parsed as { tables?: unknown }).tables === null
    ) {
      setError(t(lang, "backup.err.not_system"));
      return;
    }
    const tables = (parsed as { tables: Record<string, unknown> }).tables;
    const rows: PreviewRow[] = [];
    for (const entry of RESTORE_TABLES) {
      const value = tables[entry.table];
      if (Array.isArray(value) && value.length > 0) {
        rows.push({ table: entry.table, count: value.length });
      }
    }
    if (rows.length === 0) {
      setError(t(lang, "backup.err.empty_file"));
      return;
    }
    setFile(f);
    setPreview(rows);
  }

  async function handleRestore() {
    if (!file) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError("");
    setLoading(true);
    const formData = new FormData();
    formData.set("lang", lang);
    formData.set("file", file);
    const res = await restoreBackup(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    setReport(res.report);
    setPreview(null);
    setConfirming(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "backup.form.file")}</span>
          <input
            ref={inputRef}
            className="field-input"
            type="file"
            accept=".json,application/json"
            onChange={() => {
              setPreview(null);
              setReport(null);
              setConfirming(false);
              setError("");
            }}
          />
        </label>
      </div>
      <p className="sub">{t(lang, "backup.form.note")}</p>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handlePreview}
          disabled={loading}
        >
          {t(lang, "backup.form.preview")}
        </button>
      </div>

      {preview ? (
        <>
          <h3 className="form-section-title">{t(lang, "backup.form.preview_title")}</h3>
          <div className="detail-rows">
            {preview.map((p) => (
              <div className="row" key={p.table}>
                <span>{t(lang, `backup.tbl.${p.table}`)}</span>
                <strong>{p.count}</strong>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button
              className="btn-primary"
              type="button"
              onClick={handleRestore}
              disabled={loading}
            >
              {loading
                ? t(lang, "common.waiting")
                : confirming
                  ? t(lang, "backup.form.confirm")
                  : t(lang, "backup.form.restore")}
            </button>
          </div>
        </>
      ) : null}

      {report ? (
        <>
          <h3 className="form-section-title">{t(lang, "backup.report.title")}</h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "backup.report.col_table")}</th>
                  <th>{t(lang, "backup.report.col_total")}</th>
                  <th>{t(lang, "backup.report.col_added")}</th>
                  <th>{t(lang, "backup.report.col_skipped")}</th>
                  <th>{t(lang, "backup.report.col_closed")}</th>
                  <th>{t(lang, "backup.report.col_failed")}</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.table}>
                    <td>{t(lang, `backup.tbl.${r.table}`)}</td>
                    <td>{r.total}</td>
                    <td>{r.added}</td>
                    <td>{r.skipped}</td>
                    <td>{r.closed}</td>
                    <td>{r.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sub">{t(lang, "backup.report.note")}</p>
        </>
      ) : null}
    </div>
  );
}
