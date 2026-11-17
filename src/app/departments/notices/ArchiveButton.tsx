/**
 * مرحلہ 27 — اطلاع محفوظ کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * اطلاع حذف نہیں ہوتی — صرف محفوظ (archive) ہوتی ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveNotice } from "@/app/departments/notices/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function ArchiveButton({ id, lang = "ur" }: { id: string; lang?: Lang }) {
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
    const res = await archiveNotice(id, lang);
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
            ? t(lang, "notice.archive_confirm")
            : t(lang, "notice.archive")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
