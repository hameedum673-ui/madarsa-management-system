/**
 * مرحلہ 38 — حفظ کی پیش رفت منسوخ کرنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے، ریکارڈ رہتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidHifzProgress } from "@/app/departments/academic/actions";

export default function VoidHifzButton({
  id,
  studentId,
}: {
  id: string;
  studentId: string;
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
    const res = await voidHifzProgress(id, studentId);
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
            ? "پکا منسوخ کریں؟"
            : "منسوخ کریں"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
