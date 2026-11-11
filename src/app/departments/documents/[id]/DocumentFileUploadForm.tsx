/**
 * مرحلہ 41 — دستاویز کے ساتھ فائل لگانے کا فارم (کلائنٹ)
 * تصویر (JPG/PNG) یا PDF، زیادہ سے زیادہ 5 MB، ایک وقت میں ایک فائل۔
 */
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocumentFile } from "@/app/departments/documents/actions";

export default function DocumentFileUploadForm({
  documentId,
}: {
  documentId: string;
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
      setError("پہلے فائل چنیں۔");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.set("document_id", documentId);
    formData.set("file", file);
    const res = await uploadDocumentFile(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess("فائل لگ گئی ہے۔");
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">فائل چنیں *</span>
          <input
            ref={inputRef}
            className="field-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
          />
        </label>
      </div>
      <p className="sub">
        صرف تصویر (JPG/PNG) یا PDF — زیادہ سے زیادہ 5 MB، ایک وقت میں ایک فائل۔
      </p>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="form-error" style={{ color: "#1e7d46" }}>
          {success}
        </p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "فائل لگائیں"}
        </button>
      </div>
    </form>
  );
}
