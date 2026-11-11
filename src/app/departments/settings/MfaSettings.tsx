/**
 * مرحلہ 43 — دو مرحلوں والی تصدیق (2FA) کی ترتیبات (کلائنٹ)
 * فعال کرنا: QR کوڈ اسکین کریں (Google Authenticator جیسی مفت ایپ)، پھر
 * ایپ کا 6 ہندسوں والا کوڈ ڈال کر تصدیق کریں۔ بند کرنے کے لیے بھی ایپ کا
 * کوڈ دینا ہوگا۔ 2FA اختیاری ہے — ہر صارف خود فیصلہ کرتا ہے۔
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Factor = { id: string; status: string };

export default function MfaSettings() {
  const [loading, setLoading] = useState(true);
  const [verifiedFactor, setVerifiedFactor] = useState<Factor | null>(null);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function refreshFactors() {
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      setError("2FA کی حالت معلوم نہیں ہو سکی۔ صفحہ تازہ کر کے دیکھیں۔");
      return;
    }
    const verified = (data.totp ?? []).find(
      (f: Factor) => f.status === "verified",
    );
    setVerifiedFactor(verified ?? null);
  }

  useEffect(() => {
    refreshFactors().finally(() => setLoading(false));
  }, []);

  async function handleEnroll() {
    setError("");
    setSuccess("");
    setBusy(true);
    const supabase = createClient();
    // ادھوری پرانی کوشش ہو تو پہلے اسے ہٹا دیں تاکہ نئی کوشش صاف ہو
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of (list?.totp ?? []) as Factor[]) {
      if (f.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "میرا فون",
    });
    setBusy(false);
    if (error || !data) {
      setError("QR کوڈ نہیں بن سکا۔ دوبارہ کوشش کریں۔");
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setUri(data.totp.uri);
    setCode("");
  }

  async function handleVerifyEnable() {
    if (!/^\d{6}$/.test(code)) {
      setError("6 ہندسوں والا کوڈ لکھیں۔");
      return;
    }
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });
    setBusy(false);
    if (error) {
      setError("کوڈ درست نہیں ہے — ایپ میں نیا کوڈ دیکھ کر دوبارہ لکھیں۔");
      return;
    }
    setSuccess("دو مرحلوں والی تصدیق فعال ہو گئی ہے۔");
    setQrCode("");
    setSecret("");
    setUri("");
    setFactorId("");
    setCode("");
    await refreshFactors();
  }

  async function handleDisable() {
    if (!verifiedFactor) return;
    if (!/^\d{6}$/.test(code)) {
      setError("پہلے ایپ کا 6 ہندسوں والا کوڈ لکھیں۔");
      return;
    }
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { error: verifyError } =
      await supabase.auth.mfa.challengeAndVerify({
        factorId: verifiedFactor.id,
        code,
      });
    if (verifyError) {
      setBusy(false);
      setError("کوڈ درست نہیں ہے — ایپ میں نیا کوڈ دیکھ کر دوبارہ لکھیں۔");
      return;
    }
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    });
    setBusy(false);
    if (error) {
      setError("2FA بند نہیں ہو سکی۔ دوبارہ کوشش کریں۔");
      return;
    }
    setSuccess("دو مرحلوں والی تصدیق بند کر دی گئی ہے۔");
    setCode("");
    await refreshFactors();
  }

  if (loading) {
    return <p className="sub">2FA کی حالت دیکھی جا رہی ہے…</p>;
  }

  return (
    <div>
      {verifiedFactor ? (
        <>
          <p className="sub">
            دو مرحلوں والی تصدیق <strong>فعال ہے</strong> — لاگ اِن کے وقت
            پاس ورڈ کے بعد ایپ کا کوڈ بھی دینا ہوگا۔
          </p>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">ایپ کا 6 ہندسوں والا کوڈ *</span>
              <input
                className="field-input"
                type="text"
                inputMode="numeric"
                dir="ltr"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
              />
            </label>
          </div>
          <div className="form-actions">
            <button
              className="btn-ghost"
              type="button"
              onClick={handleDisable}
              disabled={busy}
            >
              {busy ? "براہِ کرم انتظار کریں…" : "2FA بند کریں"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sub">
            دو مرحلوں والی تصدیق <strong>بند ہے</strong> — فعال کرنے پر لاگ
            اِن کے وقت پاس ورڈ کے بعد ایپ کا کوڈ بھی دینا ہوگا۔ اس کے لیے
            فون پر Google Authenticator (مفت ایپ) چاہیے ہوگی۔
          </p>
          {!qrCode ? (
            <div className="form-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={handleEnroll}
                disabled={busy}
              >
                {busy ? "براہِ کرم انتظار کریں…" : "2FA فعال کریں"}
              </button>
            </div>
          ) : (
            <>
              <p className="sub">
                نیچے والا QR کوڈ Google Authenticator سے اسکین کریں۔ اگر
                اسکین نہ ہو تو نیچے والا خفیہ کوڈ ہاتھ سے ایپ میں لکھیں۔
              </p>
              <div
                style={{
                  background: "#ffffff",
                  padding: "12px",
                  display: "inline-block",
                  borderRadius: "8px",
                }}
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <div className="detail-rows">
                <div className="row">
                  <span>خفیہ کوڈ</span>
                  <strong dir="ltr">{secret}</strong>
                </div>
              </div>
              {uri ? (
                <p className="sub">
                  <a href={uri}>ایپ میں کھولیں</a> — فون پر یہ لنک دبانے سے
                  Authenticator ایپ خود کھل جائے گی۔
                </p>
              ) : null}
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">
                    ایپ کا 6 ہندسوں والا کوڈ *
                  </span>
                  <input
                    className="field-input"
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                  />
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="btn-primary"
                  type="button"
                  onClick={handleVerifyEnable}
                  disabled={busy}
                >
                  {busy ? "براہِ کرم انتظار کریں…" : "تصدیق کریں اور فعال کریں"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="form-error" style={{ color: "#1e7d46" }}>
          {success}
        </p>
      ) : null}

      <p className="sub">
        اگر فون گم ہو جائے یا ایپ حذف ہو جائے تو لاگ اِن نہیں ہو سکے گا — اس
        صورت میں Supabase کے ڈیش بورڈ سے 2FA ہٹانا ہوگا۔
      </p>
    </div>
  );
}
