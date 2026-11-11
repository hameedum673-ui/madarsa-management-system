/**
 * مرحلہ 26 — اجازتوں کا فارم (کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ چاروں گروپوں کے شعبے ٹک والے خانوں کے ساتھ۔
 * محفوظ ہونے پر کامیابی کا پیغام دکھاتا ہے۔
 */
"use client";

import { useState } from "react";
import { GROUPS } from "@/data/departments";
import { SECTION_IDS, SECTION_LABELS } from "@/lib/students";

type FormAction = (formData: FormData) => Promise<{ ok: true } | { error: string }>;

export default function PermissionsForm({
  userEmail,
  userName,
  allowedModules,
  allowedSections,
  action,
}: {
  userEmail: string;
  userName: string;
  allowedModules: Set<string>;
  // مرحلہ 53 — شعبے کی اجازت (بنین / بنات)
  allowedSections: Set<string>;
  action: FormAction;
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
      <h3 className="form-section-title">
        {userName} ({userEmail}) کی اجازتیں
      </h3>

      {/* مرحلہ 53 — شعبہ (بنین / بنات) کی اجازت */}
      <h3 className="form-section-title">شعبہ (بنین / بنات)</h3>
      <p className="sub">
        جس شعبے کا ٹک ہٹائیں گے، وہ شعبہ اس صارف کو نظر نہیں آئے گا۔
        پہلے سے دونوں کی اجازت ہے۔ اس سے ابھی کچھ بند نہیں ہوگا —
        روک مرحلہ 54 میں لگے گی۔
      </p>
      <div className="form-grid">
        {SECTION_IDS.map((s) => (
          <label className="field" key={s}>
            <span className="field-label">
              <input
                type="checkbox"
                name={`sec_${s}`}
                defaultChecked={allowedSections.has(s)}
              />{" "}
              {SECTION_LABELS[s]}
            </span>
          </label>
        ))}
      </div>

      {GROUPS.map((group) => {
        const modules = group.modules.filter(
          (m) => m.id !== "users" && m.id !== "permissions",
        );
        if (modules.length === 0) return null;
        return (
          <div key={group.id}>
            <h3 className="form-section-title">{group.title}</h3>
            <div className="form-grid">
              {modules.map((m) => (
                <label className="field" key={m.id}>
                  <span className="field-label">
                    <input
                      type="checkbox"
                      name={`mod_${m.id}`}
                      defaultChecked={allowedModules.has(m.id)}
                    />{" "}
                    {m.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {error ? <p className="form-error">{error}</p> : null}
      {success ? (
        <p className="att-success">اجازتیں محفوظ ہو گئیں۔</p>
      ) : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "اجازتیں محفوظ کریں"}
        </button>
      </div>
    </form>
  );
}
