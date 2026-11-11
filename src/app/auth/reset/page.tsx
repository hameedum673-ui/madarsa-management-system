/**
 * مرحلہ 33 — پاس ورڈ بدلنے کا صفحہ (ای میل والے لنک سے)
 * ای میل والا لنک ‎/auth/callback?next=/auth/reset‎ پر آتا ہے؛ callback
 * کوڈ کو سیشن میں بدلتا ہے، پھر یہ صفحہ نیا پاس ورڈ لگاتا ہے۔
 * یہ صفحہ ‎/auth/*‎ کے نیچے ہے، اس لیے middleware اسے بغیر منظوری کی
 * جانچ کے جانے دیتا ہے — ورنہ پاس ورڈ بدلنے سے پہلے ہی صارف رک جاتا۔
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
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
      setError("نیا پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("دونوں پاس ورڈ ایک جیسے نہیں ہیں — دوبارہ لکھیں۔");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);
    if (error) {
      setError("پاس ورڈ نہیں بدلا — لنک کی مدت ختم ہو گئی ہو تو دوبارہ لنک مانگیں۔");
      return;
    }
    // نیا پاس ورڈ لگ گیا — پرانا سیشن ختم کر کے لاگ اِن صفحے پر لے جائیں
    await supabase.auth.signOut();
    setSuccess("پاس ورڈ بدل گیا ہے — اب نئے پاس ورڈ سے لاگ اِن کریں۔");
  }

  function goToLogin() {
    router.push("/login");
    router.refresh();
  }

  return (
    <main className="login11-page">
      <div className="login11-box">
        <h1 className="login11-title">
          مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات
        </h1>
        <p className="login11-sub">نیا پاس ورڈ لگائیں</p>

        {!ready ? (
          <p className="login11-sub">براہِ کرم انتظار کریں…</p>
        ) : !hasSession ? (
          <>
            <p className="login11-error">
              یہ لنک درست نہیں ہے یا اس کی مدت ختم ہو گئی ہے — لاگ اِن صفحے
              سے دوبارہ لنک مانگیں۔
            </p>
            <button className="login11-submit" type="button" onClick={goToLogin}>
              لاگ اِن صفحے پر جائیں
            </button>
          </>
        ) : success ? (
          <>
            <p className="login11-error" style={{ color: "#1e7d46" }}>
              {success}
            </p>
            <button className="login11-submit" type="button" onClick={goToLogin}>
              لاگ اِن کریں
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="login11-field" htmlFor="reset-new-password">
              نیا پاس ورڈ
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
              placeholder="کم از کم 6 حروف"
            />

            <label className="login11-field" htmlFor="reset-confirm-password">
              نیا پاس ورڈ دوبارہ لکھیں
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
              {loading ? "براہِ کرم انتظار کریں…" : "نیا پاس ورڈ محفوظ کریں"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
