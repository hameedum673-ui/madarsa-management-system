/**
 * مرحلہ 41 — لگی ہوئی فائل چھپانے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * فائل Storage سے حذف نہیں ہوتی — صرف فہرست سے ہٹتی ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidDocumentFile } from "@/app/departments/documents/actions";

export default function VoidDocumentFileButton({
  id,
  documentId,
}: {
  id: string;
  documentId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError("");
    setLoading(true);
    const res = await voidDocumentFile(id, documentId);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button
        type="button"
        className="btn-ghost"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? "براہِ کرم انتظار کریں…"
          : confirming
            ? "پکا چھپائیں؟"
            : "چھپائیں"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
