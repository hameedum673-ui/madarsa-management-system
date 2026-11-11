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

interface PreviewRow {
  label: string;
  count: number;
}

export default function RestoreBackupForm() {
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
      setError("پہلے بیک اپ فائل چنیں۔");
      return;
    }
    let parsed: unknown;
    try {
      parsed = await readFile(f);
    } catch {
      setError("یہ درست JSON فائل نہیں ہے — بیک اپ فائل چنیں۔");
      return;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as { app?: unknown }).app !== "madrasa-management-system" ||
      typeof (parsed as { tables?: unknown }).tables !== "object" ||
      (parsed as { tables?: unknown }).tables === null
    ) {
      setError("یہ اس سسٹم کی بیک اپ فائل نہیں ہے۔");
      return;
    }
    const tables = (parsed as { tables: Record<string, unknown> }).tables;
    const rows: PreviewRow[] = [];
    for (const entry of RESTORE_TABLES) {
      const value = tables[entry.table];
      if (Array.isArray(value) && value.length > 0) {
        rows.push({ label: entry.label, count: value.length });
      }
    }
    if (rows.length === 0) {
      setError("اس فائل میں کوئی ڈیٹا نہیں ملا۔");
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
          <span className="field-label">بیک اپ فائل (JSON) چنیں *</span>
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
      <p className="sub">
        صرف اسی سسٹم کی بیک اپ فائل قبول ہوگی۔ جو ریکارڈ پہلے سے موجود ہے
        وہ اوور رائٹ نہیں ہوگا؛ بند مہینے کے مالی ریکارڈ نہیں لگیں گے؛
        صارفین، اجازتیں، آڈٹ لاگ، مدرسے کا پروفائل اور دستاویز کے ساتھ
        لگی فائلیں واپس نہیں لائی جائیں گی۔
      </p>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button
          className="btn-primary"
          type="button"
          onClick={handlePreview}
          disabled={loading}
        >
          جائزہ دیکھیں
        </button>
      </div>

      {preview ? (
        <>
          <h3 className="form-section-title">فائل کا جائزہ</h3>
          <div className="detail-rows">
            {preview.map((p) => (
              <div className="row" key={p.label}>
                <span>{p.label}</span>
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
                ? "براہِ کرم انتظار کریں…"
                : confirming
                  ? "پکا بحال کریں؟"
                  : "بحال کریں"}
            </button>
          </div>
        </>
      ) : null}

      {report ? (
        <>
          <h3 className="form-section-title">بحال ہونے کی رپورٹ</h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>میز</th>
                  <th>کل</th>
                  <th>نئے لگے</th>
                  <th>پہلے سے موجود</th>
                  <th>بند مہینے</th>
                  <th>ناکام</th>
                </tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.table}>
                    <td>{r.label}</td>
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
          <p className="sub">
            "پہلے سے موجود" والے ریکارڈ چھوڑ دیے گئے ہیں — وہ اوور رائٹ
            نہیں ہوئے۔ "بند مہینے" والے ریکارڈ بندش کی وجہ سے نہیں لگے؛
            چاہیں تو مہینہ کھول کر دوبارہ بحال کر سکتے ہیں۔
          </p>
        </>
      ) : null}
    </div>
  );
}
