/**
 * مرحلہ 22 — خرچ کا اندراج منسوخ کرنے کا بٹن (کلائنٹ)
 * منسوخ کرنے سے پہلے تصدیق لی جاتی ہے؛ ریکارڈ حذف نہیں ہوتا، صرف «منسوخ» ہوتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { voidStudentExpense } from "@/app/departments/student-exp/actions";

export default function VoidButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    setError("");
    setLoading(true);
    const res = await voidStudentExpense(id);
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
        اندراج منسوخ کریں
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
