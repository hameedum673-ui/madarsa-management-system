/**
 * مرحلہ 37 — فیس غیر فعال کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * فیس کا ریکارڈ حذف نہیں ہوتا — صرف غیر فعال ہوتا ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateFeeSchedule } from "@/app/departments/income/schedule/actions";
import { t, type Lang } from "@/i18n/dictionary";

export default function DeactivateButton({
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
    const res = await deactivateFeeSchedule(id, lang);
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
            ? t(lang, "schedule.deactivate_confirm")
            : t(lang, "schedule.deactivate")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
