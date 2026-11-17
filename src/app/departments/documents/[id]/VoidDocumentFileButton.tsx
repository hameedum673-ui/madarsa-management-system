/**
 * مرحلہ 41 — لگی ہوئی فائل چھپانے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * فائل Storage سے حذف نہیں ہوتی — صرف فہرست سے ہٹتی ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidDocumentFile } from "@/app/departments/documents/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function VoidDocumentFileButton({
  id,
  documentId,
  lang = "ur",
}: {
  id: string;
  documentId: string;
  lang?: Lang;
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
    const res = await voidDocumentFile(id, documentId, lang);
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
          ? t(lang, "common.waiting")
          : confirming
            ? t(lang, "doc.files.hide_confirm")
            : t(lang, "doc.files.hide")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
