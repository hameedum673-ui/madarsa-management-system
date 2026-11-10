/**
 * مرحلہ 26 — اجازتوں کا فارم (کلائنٹ)
 * اردو RTL، موبائل پر آسان۔ چاروں گروپوں کے شعبے ٹک والے خانوں کے ساتھ۔
 * محفوظ ہونے پر کامیابی کا پیغام دکھاتا ہے۔
 */
"use client";

import { useState } from "react";
import { GROUPS } from "@/data/departments";

type FormAction = (formData: FormData) => Promise<{ ok: true } | { error: string }>;

export default function PermissionsForm({
  userEmail,
  userName,
  allowedModules,
  action,
}: {
  userEmail: string;
  userName: string;
  allowedModules: Set<string>;
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
