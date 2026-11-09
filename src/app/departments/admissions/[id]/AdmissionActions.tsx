/**
 * مرحلہ 9 — نئے داخلے: منظور / مسترد کے بٹن (تفصیل والے صفحے پر)
 * دونوں کاموں سے پہلے تصدیق پوچھی جاتی ہے، کیونکہ منظوری پر طالبہ کا
 * ریکارڈ بن جاتا ہے — یہ واپس نہیں ہوتا۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SimpleAction = (id: string) => Promise<{ ok: true } | { error: string }>;

export default function AdmissionActions({
  id,
  approve,
  reject,
}: {
  id: string;
  approve: SimpleAction;
  reject: SimpleAction;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(which: "approve" | "reject") {
    setError("");
    setLoading(true);
    const res = await (which === "approve" ? approve(id) : reject(id));
    setLoading(false);
    setConfirming(null);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        {confirming === "approve" ? (
          <>
            <button
              className="btn-primary"
              type="button"
              disabled={loading}
              onClick={() => run("approve")}
            >
              {loading ? "براہِ کرم انتظار کریں…" : "جی ہاں، منظور کریں — طالبہ کا ریکارڈ بنے گا"}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={loading}
              onClick={() => setConfirming(null)}
            >
              واپس
            </button>
          </>
        ) : confirming === "reject" ? (
          <>
            <button
              className="btn-primary"
              type="button"
              disabled={loading}
              onClick={() => run("reject")}
            >
              {loading ? "براہِ کرم انتظار کریں…" : "جی ہاں، مسترد کریں"}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={loading}
              onClick={() => setConfirming(null)}
            >
              واپس
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={() => setConfirming("approve")}
            >
              منظور کریں
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setConfirming("reject")}
            >
              مسترد کریں
            </button>
          </>
        )}
      </div>
    </div>
  );
}
