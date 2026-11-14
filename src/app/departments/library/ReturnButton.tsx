/**
 * مرحلہ 101 — کتاب واپس لکھنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * واپسی لکھنے پر ریکارڈ ختم نہیں ہوتا — صرف حالت بدلتی ہے، تاریخ رہتی ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import { returnBook } from "@/app/departments/library/actions";

export default function ReturnButton({
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
    const res = await returnBook(id, lang);
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
            ? t(lang, "library.return.confirm")
            : t(lang, "library.return")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
