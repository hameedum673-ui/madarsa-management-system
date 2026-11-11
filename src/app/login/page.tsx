/**
 * مرحلہ 11 — لاگ اِن صفحہ، نیا ڈیزائن (اردو RTL)
 * گہرا نیوی بلیو پس منظر، سنہری عنوان (مدرسے کا نام)، سنہری گوگل بٹن،
 * سبز واٹس ایپ بٹن۔ گوگل سے لاگ اِن کے بعد منظوری کی جانچ سرور پر ہوتی ہے۔
 * ای میل + پاس ورڈ والا لاگ اِن بھی موجود ہے (چھوٹا لنک) تاکہ گوگل میں کوئی
 * مسئلہ ہو تو ایڈمن کبھی باہر نہ رہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { WHATSAPP_URL } from "@/lib/approval";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // مرحلہ 33 — "پاس ورڈ بھول گئے" کا فارم
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  async function handleGoogleLogin() {
    setGoogleError("");
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setGoogleLoading(false);
    if (error) {
      setGoogleError(
        "گوگل لاگ اِن ابھی ترتیب نہیں ہوا ہے — براہِ کرم ای میل اور پاس ورڈ سے لاگ اِن کریں۔",
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (error) {
      setError("ای میل یا پاس ورڈ درست نہیں ہے۔ دوبارہ کوشش کریں۔");
      return;
    }

    // مرحلہ 43 — 2FA فعال ہو تو پہلے کوڈ والا صفحہ کھلے گا
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      router.push("/auth/mfa-verify");
    } else {
      router.push("/");
    }
    router.refresh();
  }

  // مرحلہ 33 — پاس ورڈ بدلنے کا لنک ای میل پر بھیجیں۔
  // حفاظت: یہ نہیں بتایا جاتا کہ ای میل رجسٹرڈ ہے یا نہیں — ہمیشہ ایک ہی پیغام۔
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotMessage("");
    setForgotLoading(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    setForgotLoading(false);
    setForgotMessage(
      "اگر یہ ای میل رجسٹرڈ ہے تو پاس ورڈ بدلنے کا لنک بھیج دیا گیا ہے — ان باکس (اور اسپیم فولڈر) دیکھیں۔",
    );
  }

  return (
    <main className="login11-page">
      <div className="login11-box">
        <h1 className="login11-title">
          مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات
        </h1>
        <p className="login11-sub">جامع مدرسہ مینجمنٹ سسٹم</p>

        <button
          className="login11-google"
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
        >
          <span className="login11-g">G</span>
          {googleLoading
            ? "براہِ کرم انتظار کریں…"
            : "گوگل کے ساتھ لاگ اِن کریں"}
        </button>

        {googleError ? <p className="login11-error">{googleError}</p> : null}

        <a
          className="login11-whatsapp"
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
        >
          <svg
            className="login11-wa-icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3.6 4.6c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1.1 2.6c.1.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.7.5-.1 1.6-.7 1.8-1.3.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3l-2.1-1c-.3-.1-.5-.2-.7.1l-1 1.1c-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-1-2.3c-.2-.5-.4-.5-.6-.5z" />
          </svg>
          واٹس ایپ پر رابطہ کریں
        </a>

        <button
          className="login11-toggle"
          type="button"
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword
            ? "پاس ورڈ والا فارم بند کریں"
            : "ای میل اور پاس ورڈ سے لاگ اِن کریں"}
        </button>

        {showPassword ? (
          <form onSubmit={handleSubmit}>
            <label className="login11-field" htmlFor="login-email">
              ای میل
            </label>
            <input
              id="login-email"
              className="login11-input"
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            <label className="login11-field" htmlFor="login-password">
              پاس ورڈ
            </label>
            <input
              id="login-password"
              className="login11-input"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />

            {error ? <p className="login11-error">{error}</p> : null}

            <button className="login11-submit" type="submit" disabled={loading}>
              {loading ? "براہِ کرم انتظار کریں…" : "لاگ اِن کریں"}
            </button>
          </form>
        ) : null}

        <button
          className="login11-toggle"
          type="button"
          onClick={() => {
            setShowForgot((v) => !v);
            setForgotMessage("");
          }}
        >
          {showForgot ? "پاس ورڈ بھول گئے والا فارم بند کریں" : "پاس ورڈ بھول گئے؟"}
        </button>

        {showForgot ? (
          <form onSubmit={handleForgot}>
            <label className="login11-field" htmlFor="forgot-email">
              اپنی ای میل لکھیں
            </label>
            <input
              id="forgot-email"
              className="login11-input"
              type="email"
              dir="ltr"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
            {forgotMessage ? (
              <p className="login11-error" style={{ color: "#1e7d46" }}>
                {forgotMessage}
              </p>
            ) : null}
            <button
              className="login11-submit"
              type="submit"
              disabled={forgotLoading}
            >
              {forgotLoading
                ? "براہِ کرم انتظار کریں…"
                : "پاس ورڈ بدلنے کا لنک بھیجیں"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
