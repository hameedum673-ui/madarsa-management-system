/**
 * مرحلہ 39 — مہینہ بند کرنے / دوبارہ کھولنے کے بٹن (کلائنٹ)
 * بند کرنا دو مرحلوں والی تصدیق مانگتا ہے؛ دوبارہ کھولنا بھی۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  closeMonth,
  reopenMonth,
} from "@/app/departments/monthly/actions";

export default function MonthClosingControls({
  month,
  isClosed,
}: {
  month: string;
  isClosed: boolean;
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
      ? await reopenMonth(month)
      : await closeMonth(month);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    setSuccess(isClosed ? "مہینہ دوبارہ کھول دیا گیا ہے۔" : "مہینہ بند کر دیا گیا ہے۔");
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
          ? "براہِ کرم انتظار کریں…"
          : confirming
            ? isClosed
              ? "پکا دوبارہ کھولیں؟"
              : "پکا بند کریں؟"
            : isClosed
              ? "مہینہ دوبارہ کھولیں"
              : "مہینہ بند کریں"}
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
