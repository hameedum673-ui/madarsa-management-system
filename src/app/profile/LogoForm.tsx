/**
 * مرحلہ 98 — مدرسے کا لوگو (کلائنٹ)
 * لوگو سب کو دکھتا ہے؛ لگانا/ہٹانا صرف مالک کا کام ہے۔
 */
"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { removeMadrasaLogo, uploadMadrasaLogo } from "@/app/profile/actions";

export default function LogoForm({
  logoUrl,
  canManage,
  madrasaName,
}: {
  logoUrl: string | null;
  canManage: boolean;
  madrasaName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const shown = preview ?? logoUrl;
  const firstLetter = (madrasaName || "ح").trim().charAt(0) || "ح";

  function handlePick(ev: ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    setError("");
    setSaved(false);
    if (!file) {
      setPreview(null);
      setFileName("");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("صرف JPG، PNG یا WebP تصویر چلے گی۔");
      setPreview(null);
      setFileName("");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("تصویر 2MB سے بڑی ہے — چھوٹی تصویر چنیں۔");
      setPreview(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  async function handleUpload() {
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("پہلے تصویر چنیں۔");
      return;
    }
    setError("");
    setSaved(false);
    setLoading(true);
    const formData = new FormData();
    formData.set("logo", file);
    const result = await uploadMadrasaLogo(formData);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPreview(null);
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
    setSaved(true);
    router.refresh();
  }

  async function handleRemove() {
    setError("");
    setSaved(false);
    setLoading(true);
    const result = await removeMadrasaLogo();
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPreview(null);
    setSaved(true);
    router.refresh();
  }

  return (
    <div>
      <h3 className="form-section-title">مدرسے کا لوگو</h3>
      {shown ? (
        <img className="logo-preview" src={shown} alt="مدرسے کا لوگو" />
      ) : (
        <div className="logo-preview-letter" aria-hidden="true">
          {firstLetter}
        </div>
      )}
      {canManage ? (
        <>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label className="field">
              <span className="field-label">تصویر چنیں (JPG، PNG یا WebP — زیادہ سے زیادہ 2MB)</span>
              <input
                className="field-input"
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePick}
              />
            </label>
          </div>
          {fileName ? <p className="form-note">{fileName}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {saved ? <p className="form-note">لوگو محفوظ ہو گیا۔</p> : null}
          <div className="form-actions">
            <button
              className="btn-primary"
              type="button"
              disabled={loading || !fileName}
              onClick={handleUpload}
            >
              {loading ? "براہِ کرم انتظار کریں…" : "لوگو لگائیں"}
            </button>
            {logoUrl ? (
              <button
                className="btn-ghost"
                type="button"
                disabled={loading}
                onClick={handleRemove}
              >
                لوگو ہٹائیں
              </button>
            ) : null}
          </div>
          <p className="form-note">
            لوگو ڈیش بورڈ کی سرخی میں گول دکھے گا — مہمان کو بھی نظر آئے گا۔
          </p>
        </>
      ) : (
        <p className="form-note">
          لوگو صرف مدرسے کا مالک بدل سکتا ہے۔
        </p>
      )}
    </div>
  );
}
