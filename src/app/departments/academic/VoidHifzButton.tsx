/**
 * مرحلہ 38 — حفظ کی پیش رفت منسوخ کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidHifzProgress } from "@/app/departments/academic/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function VoidHifzButton({
  id,
  studentId,
  lang,
}: {
  id: string;
  studentId: string;
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
    const res = await voidHifzProgress(id, studentId, lang);
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
            ? t(lang, "hifz.void.confirm")
            : t(lang, "common.cancel")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
