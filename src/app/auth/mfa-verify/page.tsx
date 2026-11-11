/**
 * مرحلہ 43 — لاگ اِن کے دوسرے قدم کی تصدیق (کلائنٹ)
 * پاس ورڈ (یا گوگل) کے بعد یہ صفحہ کھلتا ہے — Authenticator ایپ کا 6
 * ہندسوں والا کوڈ ڈالیں۔ کوڈ درست ہو تو ڈیش بورڈ کھل جائے گا۔
 * اگر 2FA فعال ہی نہیں ہے، یا تصدیق پہلے ہو چکی ہے، تو سیدھا ڈیش بورڈ۔
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MfaVerifyPage() {
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
      setError("6 ہندسوں والا کوڈ لکھیں۔");
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
      setError("کوڈ درست نہیں ہے — ایپ میں نیا کوڈ دیکھ کر دوبارہ لکھیں۔");
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
          <p className="login11-sub">جانچ ہو رہی ہے…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="login11-page">
      <div className="login11-box">
        <h1 className="login11-title">دو مرحلوں والی تصدیق</h1>
        <p className="login11-sub">
          Authenticator ایپ میں 6 ہندسوں والا کوڈ دیکھیں اور یہاں لکھیں۔
        </p>
        <form onSubmit={handleSubmit}>
          <label className="login11-field" htmlFor="mfa-code">
            6 ہندسوں والا کوڈ
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
            {loading ? "براہِ کرم انتظار کریں…" : "تصدیق کریں"}
          </button>
        </form>
        <button className="login11-toggle" type="button" onClick={handleLogout}>
          لاگ آؤٹ کریں
        </button>
      </div>
    </main>
  );
}
