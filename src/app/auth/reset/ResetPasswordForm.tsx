"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t, type Lang } from "@/i18n/dictionary";

// مرحلہ 33 — پاس ورڈ بدلنے کا فارم (کلائنٹ)؛ زبان server صفحے سے آتی ہے
export default function ResetPasswordForm({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setHasSession(!!user);
      setReady(true);
    }
    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError(t(lang, "auth.reset_err_short"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t(lang, "auth.reset_err_mismatch"));
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);
    if (error) {
      setError(t(lang, "auth.reset_err_failed"));
      return;
    }
    // نیا پاس ورڈ لگ گیا — پرانا سیشن ختم کر کے لاگ اِن صفحے پر لے جائیں
    await supabase.auth.signOut();
    setSuccess(t(lang, "auth.reset_done"));
  }

  function goToLogin() {
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="login11-page">
      <div className="login11-box">
        <h1 className="login11-title">{t(lang, "app.name")}</h1>
        <p className="login11-sub">{t(lang, "auth.reset_sub")}</p>

        {!ready ? (
          <p className="login11-sub">{t(lang, "common.wait")}</p>
        ) : !hasSession ? (
          <>
            <p className="login11-error">{t(lang, "auth.reset_bad_link")}</p>
            <button className="login11-submit" type="button" onClick={goToLogin}>
              {t(lang, "auth.reset_go_login")}
            </button>
          </>
        ) : success ? (
          <>
            <p className="login11-error" style={{ color: "#1e7d46" }}>
              {success}
            </p>
            <button className="login11-submit" type="button" onClick={goToLogin}>
              {t(lang, "auth.reset_login")}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="login11-field" htmlFor="reset-new-password">
              {t(lang, "auth.reset_new")}
            </label>
            <input
              id="reset-new-password"
              className="login11-input"
              type="password"
              dir="ltr"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder={t(lang, "auth.reset_new_ph")}
            />

            <label className="login11-field" htmlFor="reset-confirm-password">
              {t(lang, "auth.reset_confirm")}
            </label>
            <input
              id="reset-confirm-password"
              className="login11-input"
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
            />

            {error ? <p className="login11-error">{error}</p> : null}

            <button className="login11-submit" type="submit" disabled={loading}>
              {loading ? t(lang, "common.wait") : t(lang, "auth.reset_save")}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
