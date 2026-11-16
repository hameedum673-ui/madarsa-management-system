/**
 * مرحلہ 39 — مہینہ بند کرنے / دوبارہ کھولنے کے بٹن (کلائنٹ)
 * بند کرنا دو مرحلوں والی تصدیق مانگتا ہے؛ دوبارہ کھولنا بھی۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";
import {
  closeMonth,
  reopenMonth,
} from "@/app/departments/monthly/actions";

export default function MonthClosingControls({
  month,
  isClosed,
  lang,
}: {
  month: string;
  isClosed: boolean;
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
    const res = isClosed
      ? await reopenMonth(month, lang)
      : await closeMonth(month, lang);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    setSuccess(
      isClosed
        ? t(lang, "monthly.reopened_success")
        : t(lang, "monthly.closed_success"),
    );
    setConfirming(false);
    router.refresh();
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
            ? isClosed
              ? t(lang, "monthly.confirm_reopen")
              : t(lang, "monthly.confirm_close")
            : isClosed
              ? t(lang, "monthly.reopen")
              : t(lang, "monthly.close")}
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
