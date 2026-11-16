/**
 * مرحلہ 20 — عطیہ منسوخ کرنے کا بٹن (کلائنٹ)
 * منسوخ کرنے سے پہلے تصدیق لی جاتی ہے؛ ریکارڈ حذف نہیں ہوتا، صرف «منسوخ» ہوتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidDonation } from "@/app/departments/donations/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function VoidButton({
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

  async function handleVoid() {
    setError("");
    setLoading(true);
    const res = await voidDonation(id, lang);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        className="btn-ghost"
        type="button"
        onClick={() => setConfirming(true)}
      >
        {t(lang, "donations.void")}
      </button>
    );
  }

  return (
    <span>
      <button
        className="btn-ghost"
        type="button"
        onClick={handleVoid}
        disabled={loading}
      >
        {loading ? t(lang, "common.wait") : t(lang, "expense.void_confirm")}
      </button>{" "}
      <button
        className="btn-primary"
        type="button"
        onClick={() => setConfirming(false)}
      >
        {t(lang, "common.back")}
      </button>
      {error ? <span className="form-error"> {error}</span> : null}
    </span>
  );
}
