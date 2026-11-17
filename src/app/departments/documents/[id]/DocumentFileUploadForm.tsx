/**
 * مرحلہ 41 — دستاویز کے ساتھ فائل لگانے کا فارم (کلائنٹ)
 * تصویر (JPG/PNG) یا PDF، زیادہ سے زیادہ 5 MB، ایک وقت میں ایک فائل۔
 */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentFile } from "@/app/departments/documents/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function DocumentFileUploadForm({
  documentId,
  lang = "ur",
}: {
  documentId: string;
  lang?: Lang;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError(t(lang, "doc.err.choose_file"));
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.set("document_id", documentId);
    formData.set("file", file);
    formData.set("lang", lang);
    const res = await uploadDocumentFile(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess(t(lang, "doc.files.uploaded"));
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "doc.files.choose")}</span>
          <input
            ref={inputRef}
            className="field-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
          />
        </label>
      </div>
      <p className="sub">{t(lang, "doc.files.note")}</p>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="form-error" style={{ color: "#1e7d46" }}>
          {success}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.waiting") : t(lang, "doc.files.upload")}
        </button>
      </div>
    </form>
  );
}
