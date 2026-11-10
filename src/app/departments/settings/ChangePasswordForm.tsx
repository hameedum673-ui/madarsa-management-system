/**
 * مرحلہ 31 — پاس ورڈ تبدیل کرنے کا فارم (کلائنٹ)
 * پہلے موجودہ پاس ورڈ سے جانچ ہوتی ہے، پھر نیا پاس ورڈ لگایا جاتا ہے۔
 * گوگل سے لاگ اِن والے صارف کا کوئی پاس ورڈ نہیں ہوتا — ان کے لیے یہ
 * فارم کام نہیں کرے گا، صفحے پر صاف لکھا ہے۔
 */
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm({ email }: { email: string }) {
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
      setError("تینوں خانے بھرنا ضروری ہیں۔");
      return;
    }
    if (next.length < 6) {
      setError("نیا پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔");
      return;
    }
    if (next !== confirm) {
      setError("نیا پاس ورڈ اور تصدیق ایک جیسے نہیں ہیں۔");
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
      setError(
        "موجودہ پاس ورڈ درست نہیں ہے۔ (اگر آپ گوگل سے لاگ اِن ہوتے ہیں تو آپ کا کوئی پاس ورڈ نہیں ہے۔)",
      );
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: next,
    });
    setLoading(false);
    if (updateError) {
      setError("پاس ورڈ تبدیل نہیں ہو سکا۔ دوبارہ کوشش کریں۔");
      return;
    }
    setSuccess(true);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="form-section-title">پاس ورڈ تبدیل کریں</h3>
      <p className="sub">
        اگر آپ گوگل کے بٹن سے لاگ اِن ہوتے ہیں تو آپ کا کوئی پاس ورڈ نہیں
        ہے — یہ فارم صرف ان کے لیے ہے جن کا پاس ورڈ بنا ہوا ہے۔
      </p>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">موجودہ پاس ورڈ *</span>
          <input
            className="field-input"
            type="password"
            name="current_password"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">نیا پاس ورڈ *</span>
          <input
            className="field-input"
            type="password"
            name="new_password"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="field">
          <span className="field-label">نئے پاس ورڈ کی تصدیق *</span>
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
      {success ? <p className="att-success">پاس ورڈ تبدیل ہو گیا ہے۔</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "پاس ورڈ تبدیل کریں"}
        </button>
      </div>
    </form>
  );
}
