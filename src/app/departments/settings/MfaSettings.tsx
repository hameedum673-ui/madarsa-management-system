/**
 * مرحلہ 43 — دو مرحلوں والی تصدیق (2FA) کی ترتیبات (کلائنٹ)
 * فعال کرنا: QR کوڈ اسکین کریں (Google Authenticator جیسی مفت ایپ)، پھر
 * ایپ کا 6 ہندسوں والا کوڈ ڈال کر تصدیق کریں۔ بند کرنے کے لیے بھی ایپ کا
 * کوڈ دینا ہوگا۔ 2FA اختیاری ہے — ہر صارف خود فیصلہ کرتا ہے۔
 */
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { t, type Lang } from "@/i18n/dictionary";

type Factor = { id: string; status: string };

export default function MfaSettings({ lang = "ur" }: { lang?: Lang }) {
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
      setError(t(lang, "settings.mfa.err.state"));
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
      friendlyName: lang === "ar" ? "هاتفي" : "میرا فون",
    });
    setBusy(false);
    if (error || !data) {
      setError(t(lang, "settings.mfa.err.qr"));
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
      setError(t(lang, "settings.mfa.err.code"));
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
      setError(t(lang, "settings.mfa.err.wrong"));
      return;
    }
    setSuccess(t(lang, "settings.mfa.enabled"));
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
      setError(t(lang, "settings.mfa.err.code_first"));
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
      setError(t(lang, "settings.mfa.err.wrong"));
      return;
    }
    const { error } = await supabase.auth.mfa.unenroll({
      factorId: verifiedFactor.id,
    });
    setBusy(false);
    if (error) {
      setError(t(lang, "settings.mfa.err.disable_failed"));
      return;
    }
    setSuccess(t(lang, "settings.mfa.disabled"));
    setCode("");
    await refreshFactors();
  }

  if (loading) {
    return <p className="sub">{t(lang, "settings.mfa.loading")}</p>;
  }

  return (
    <div>
      {verifiedFactor ? (
        <>
          <p className="sub">
            {t(lang, "settings.mfa.name")}{" "}
            <strong>{t(lang, "settings.mfa.state_on")}</strong>{" "}
            {t(lang, "settings.mfa.active_rest")}
          </p>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">{t(lang, "settings.mfa.code_label")}</span>
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
              {busy ? t(lang, "common.waiting") : t(lang, "settings.mfa.disable")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="sub">
            {t(lang, "settings.mfa.name")}{" "}
            <strong>{t(lang, "settings.mfa.state_off")}</strong>{" "}
            {t(lang, "settings.mfa.inactive_rest")}
          </p>
          {!qrCode ? (
            <div className="form-actions">
              <button
                className="btn-primary"
                type="button"
                onClick={handleEnroll}
                disabled={busy}
              >
                {busy ? t(lang, "common.waiting") : t(lang, "settings.mfa.enable")}
              </button>
            </div>
          ) : (
            <>
              <p className="sub">{t(lang, "settings.mfa.scan_note")}</p>
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
                  <span>{t(lang, "settings.mfa.secret")}</span>
                  <strong dir="ltr">{secret}</strong>
                </div>
              </div>
              {uri ? (
                <p className="sub">
                  <a href={uri}>{t(lang, "settings.mfa.open_app")}</a>{" "}
                  {t(lang, "settings.mfa.open_app_note")}
                </p>
              ) : null}
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">
                    {t(lang, "settings.mfa.code_label")}
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
                  {busy ? t(lang, "common.waiting") : t(lang, "settings.mfa.verify_enable")}
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

      <p className="sub">{t(lang, "settings.mfa.lost_note")}</p>
    </div>
  );
}
