/**
 * مرحلہ 101 — کتاب واپس لکھنے کا بٹن (کلائنٹ، دو مرحلوں والی تصدیق)
 * واپسی لکھنے پر ریکارڈ ختم نہیں ہوتا — صرف حالت بدلتی ہے، تاریخ رہتی ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { returnBook } from "@/app/departments/library/actions";

export default function ReturnButton({ id }: { id: string }) {
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
    const res = await returnBook(id);
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
            ? "پکا واپس آ گئی؟"
            : "واپس آ گئی"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}
