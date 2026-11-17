/**
 * مرحلہ 26 — اجازتوں کا فارم (کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ چاروں گروپوں کے شعبے ٹک والے خانوں کے ساتھ۔
 * محفوظ ہونے پر کامیابی کا پیغام دکھاتا ہے۔
 */
"use client";

import { useState } from "react";
import { GROUPS } from "@/data/departments";
import { SECTION_IDS } from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (formData: FormData) => Promise<{ ok: true } | { error: string }>;

export default function PermissionsForm({
  userEmail,
  userName,
  allowedModules,
  allowedSections,
  action,
  lang = "ur",
}: {
  userEmail: string;
  userName: string;
  allowedModules: Set<string>;
  // مرحلہ 53 — شعبے کی اجازت (بنین / بنات)
  allowedSections: Set<string>;
  action: FormAction;
  lang?: Lang;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="user_email" value={userEmail} />
      <input type="hidden" name="lang" value={lang} />
      <h3 className="form-section-title">
        {t(lang, "permissions.user_title", { name: userName, email: userEmail })}
      </h3>

      {/* مرحلہ 53 — شعبہ (بنین / بنات) کی اجازت */}
      <h3 className="form-section-title">
        {t(lang, "permissions.section_title")}
      </h3>
      <p className="sub">{t(lang, "permissions.section_sub")}</p>
      <div className="form-grid">
        {SECTION_IDS.map((s) => (
          <label className="field" key={s}>
            <span className="field-label">
              <input
                type="checkbox"
                name={`sec_${s}`}
                defaultChecked={allowedSections.has(s)}
              />{" "}
              {t(lang, `section.${s}`)}
            </span>
          </label>
        ))}
      </div>

      {GROUPS.map((group) => {
        // مرحلہ 60 — "تنخواہیں" بھی صرف ایڈمن کی ہے، اس کا خانہ
        // کچھ نہیں کرتا تھا (بے کار خانہ ہٹا دیا گیا)
        const modules = group.modules.filter(
          (m) =>
            m.id !== "users" && m.id !== "permissions" && m.id !== "salaries",
        );
        if (modules.length === 0) return null;
        return (
          <div key={group.id}>
            <h3 className="form-section-title">
              {t(lang, `group.${group.id}`)}
            </h3>
            <div className="form-grid">
              {modules.map((m) => (
                <label className="field" key={m.id}>
                  <span className="field-label">
                    <input
                      type="checkbox"
                      name={`mod_${m.id}`}
                      defaultChecked={allowedModules.has(m.id)}
                    />{" "}
                    {t(lang, `module.${m.id}`)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="att-success">{t(lang, "permissions.saved")}</p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading
            ? t(lang, "common.waiting")
            : t(lang, "permissions.save")}
        </button>
      </div>
    </form>
  );
}
