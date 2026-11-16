/**
 * مرحلہ 39 — پورا سال بند کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * سال کے 12 مہینے ایک ساتھ بند ہوتے ہیں۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import { closeYear } from "@/app/departments/yearly/actions";

export default function CloseYearButton({
  year,
  allClosed,
  lang,
}: {
  year: string;
  allClosed: boolean;
  lang: Lang;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await closeYear(year, lang);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    setSuccess(t(lang, "yearly.closed_success"));
    setConfirming(false);
    router.refresh();
  }

  if (allClosed) {
    return <p className="empty-state">{t(lang, "yearly.all_closed")}</p>;
  }

  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? t(lang, "common.wait")
          : confirming
            ? t(lang, "yearly.confirm_close")
            : t(lang, "yearly.close")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="form-error" style={{ color: "#1e7d46" }}>
          {success}
        </p>
      ) : null}
    </div>
  );
}
