/**
 * مرحلہ 3 — لاگ اِن صفحہ (اردو RTL، ڈیش بورڈ کے رنگوں میں)
 * ای میل + پاس ورڈ سے Supabase Auth میں سائن اِن ہوتا ہے۔
 * کامیابی پر مین ڈیش بورڈ پر لے جاتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    router.push("/");
    router.refresh();
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <h1 className="login-title">لاگ اِن</h1>
        <p className="login-sub">
          جامع مدرسہ مینجمنٹ سسٹم — مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات
        </p>

        <form onSubmit={handleSubmit}>
          <label className="login-field" htmlFor="login-email">
            ای میل
          </label>
          <input
            id="login-email"
            className="login-input"
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />

          <label className="login-field" htmlFor="login-password">
            پاس ورڈ
          </label>
          <input
            id="login-password"
            className="login-input"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />

          {error ? <p className="login-error">{error}</p> : null}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? "براہِ کرم انتظار کریں…" : "لاگ اِن کریں"}
          </button>
        </form>
      </div>
    </main>
  );
}
