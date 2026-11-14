/**
 * مرحلہ 100 — کتاب محفوظ کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * کتاب حذف نہیں ہوتی — صرف محفوظ (archive) ہوتی ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import { archiveBook } from "@/app/departments/library/actions";

export default function ArchiveButton({
  id,
  lang,
}: {
  id: string;
  lang: Lang;
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
    const res = await archiveBook(id, lang);
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
          ? t(lang, "common.wait")
          : confirming
            ? t(lang, "library.archive.confirm")
            : t(lang, "library.archive")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
