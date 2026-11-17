/**
 * مرحلہ 31 — پاس ورڈ تبدیل کرنے کا فارم (کلائنٹ)
 * پہلے موجودہ پاس ورڈ سے جانچ ہوتی ہے، پھر نیا پاس ورڈ لگایا جاتا ہے۔
 * گوگل سے لاگ اِن والے صارف کا کوئی پاس ورڈ نہیں ہوتا — ان کے لیے یہ
 * فارم کام نہیں کرے گا، صفحے پر صاف لکھا ہے۔
 */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { t, type Lang } from "@/i18n/dictionary";

export default function ChangePasswordForm({ email, lang = "ur" }: { email: string; lang?: Lang }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const current = String(formData.get("current_password") ?? "");
    const next = String(formData.get("new_password") ?? "");
    const confirm = String(formData.get("confirm_password") ?? "");

    if (!current || !next || !confirm) {
      setError(t(lang, "settings.pw.err.all_required"));
      return;
    }
    if (next.length < 6) {
      setError(t(lang, "settings.pw.err.min_length"));
      return;
    }
    if (next !== confirm) {
      setError(t(lang, "settings.pw.err.mismatch"));
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // پہلے موجودہ پاس ورڈ کی جانچ
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setLoading(false);
      setError(t(lang, "settings.pw.err.current_wrong"));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });
    setLoading(false);
    if (updateError) {
      setError(t(lang, "settings.pw.err.failed"));
      return;
    }
    setSuccess(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">{t(lang, "settings.pw.title")}</h3>
      <p className="sub">{t(lang, "settings.pw.note")}</p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "settings.pw.current")}</span>
          <input
            className="field-input"
            type="password"
            name="current_password"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "settings.pw.new")}</span>
          <input
            className="field-input"
            type="password"
            name="new_password"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "settings.pw.confirm")}</span>
          <input
            className="field-input"
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            required
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="att-success">{t(lang, "settings.pw.changed")}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.waiting") : t(lang, "settings.pw.title")}
        </button>
      </div>
    </form>
  );
}
