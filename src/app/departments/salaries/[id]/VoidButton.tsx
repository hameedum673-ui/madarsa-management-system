/**
 * مرحلہ 50 — تنخواہ کی ادائیگی منسوخ کرنے کا بٹن (کلائنٹ)
 * منسوخ کرنے سے پہلے تصدیق لی جاتی ہے؛ ریکارڈ حذف نہیں ہوتا، صرف
 * «منسوخ» ہوتا ہے — اور اس سے جڑا واؤچر بھی منسوخ ہوتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidSalaryPayment } from "@/app/departments/salaries/actions";

export default function VoidButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    setError("");
    setLoading(true);
    const res = await voidSalaryPayment(id);
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
        ادائیگی منسوخ کریں
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
        {loading ? "براہِ کرم انتظار کریں…" : "جی ہاں، منسوخ کریں"}
      </button>{" "}
      <button
        className="btn-primary"
        type="button"
        onClick={() => setConfirming(false)}
      >
        واپس
      </button>
      {error ? <span className="form-error"> {error}</span> : null}
    </span>
  );
}
