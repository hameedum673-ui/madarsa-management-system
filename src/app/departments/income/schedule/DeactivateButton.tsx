/**
 * مرحلہ 37 — فیس غیر فعال کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * فیس کا ریکارڈ حذف نہیں ہوتا — صرف غیر فعال ہوتا ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateFeeSchedule } from "@/app/departments/income/schedule/actions";

export default function DeactivateButton({ id }: { id: string }) {
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
    const res = await deactivateFeeSchedule(id);
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
            ? "پکا غیر فعال کریں؟"
            : "غیر فعال کریں"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
