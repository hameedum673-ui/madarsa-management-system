"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t, type Lang } from "@/i18n/dictionary";

// مرحلہ 43 — لاگ اِن کے دوسرے قدم کی تصدیق (کلائنٹ)؛ زبان server صفحے سے آتی ہے
export default function MfaVerifyForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      // پہلے ہی تصدیق ہو چکی ہو → ڈیش بورڈ
      if (aal?.currentLevel === "aal2") {
        router.push("/");
        return;
      }
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = (data?.totp ?? []).find(
        (f: { status?: string }) => f.status === "verified",
      );
      if (!verified) {
        // 2FA فعال ہی نہیں ہے → ڈیش بورڈ
        router.push("/");
        return;
      }
      setFactorId(verified.id);
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError(t(lang, "auth.mfa_err_code"));
      return;
    }
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    setLoading(false);
    if (error) {
      setError(t(lang, "auth.mfa_err_wrong"));
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (checking) {
    return (
      <main className="login11-page">
        <div className="login11-box">
          <p className="login11-sub">{t(lang, "auth.mfa_checking")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login11-page">
      <div className="login11-box">
        <h1 className="login11-title">{t(lang, "auth.mfa_title")}</h1>
        <p className="login11-sub">{t(lang, "auth.mfa_sub")}</p>
        <form onSubmit={handleSubmit}>
          <label className="login11-field" htmlFor="mfa-code">
            {t(lang, "auth.mfa_code")}
          </label>
          <input
            id="mfa-code"
            className="login11-input"
            type="text"
            inputMode="numeric"
            dir="ltr"
            maxLength={6}
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            autoComplete="one-time-code"
            placeholder="123456"
          />
          {error ? <p className="login11-error">{error}</p> : null}
          <button className="login11-submit" type="submit" disabled={loading}>
            {loading ? t(lang, "common.wait") : t(lang, "auth.mfa_verify")}
          </button>
        </form>
        <button className="login11-toggle" type="button" onClick={handleLogout}>
          {t(lang, "topbar.logout")}
        </button>
      </div>
    </main>
  );
}
