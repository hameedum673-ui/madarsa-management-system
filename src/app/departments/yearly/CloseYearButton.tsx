/**
 * مرحلہ 39 — پورا سال بند کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * سال کے 12 مہینے ایک ساتھ بند ہوتے ہیں۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { closeYear } from "@/app/departments/yearly/actions";

export default function CloseYearButton({
  year,
  allClosed,
}: {
  year: string;
  allClosed: boolean;
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
    const res = await closeYear(year);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    setSuccess("پورا سال بند کر دیا گیا ہے۔");
    setConfirming(false);
    router.refresh();
  }

  if (allClosed) {
    return <p className="empty-state">اس سال کے تمام مہینے بند ہیں۔</p>;
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
            ? "پکا پورا سال بند کریں؟"
            : "پورا سال بند کریں"}
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
