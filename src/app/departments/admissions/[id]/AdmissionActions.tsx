/**
 * مرحلہ 9 — نئے داخلے: منظور / مسترد کے بٹن (تفصیل والے صفحے پر)
 * دونوں کاموں سے پہلے تصدیق پوچھی جاتی ہے، کیونکہ منظوری پر طالبہ کا
 * ریکارڈ بن جاتا ہے — یہ واپس نہیں ہوتا۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t, type Lang } from "@/i18n/dictionary";

type SimpleAction = (
  id: string,
  lang?: Lang,
) => Promise<{ ok: true } | { error: string }>;

export default function AdmissionActions({
  id,
  approve,
  reject,
  lang = "ur",
}: {
  id: string;
  approve: SimpleAction;
  reject: SimpleAction;
  lang?: Lang;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(which: "approve" | "reject") {
    setError("");
    setLoading(true);
    const res = await (which === "approve" ? approve(id, lang) : reject(id, lang));
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
              {loading ? t(lang, "common.wait") : t(lang, "admission.actions.confirm_approve")}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={loading}
              onClick={() => setConfirming(null)}
            >
              {t(lang, "common.back")}
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
              {loading ? t(lang, "common.wait") : t(lang, "admission.actions.confirm_reject")}
            </button>
            <button
              className="btn-ghost"
              type="button"
              disabled={loading}
              onClick={() => setConfirming(null)}
            >
              {t(lang, "common.back")}
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={() => setConfirming("approve")}
            >
              {t(lang, "admission.actions.approve")}
            </button>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => setConfirming("reject")}
            >
              {t(lang, "admission.actions.reject")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
