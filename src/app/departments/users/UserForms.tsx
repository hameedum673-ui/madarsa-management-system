/**
 * مرحلہ 11 — صارفین کی منظوری کے فارم (کلائنٹ)
 * ہر فارم سرور ایکشن چلاتا ہے؛ غلطی ہو تو اردو پیغام دکھاتا ہے،
 * کامیابی پر فہرست تازہ کرتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/approval";
import {
  addApprovedUser,
  approveUser,
  setUserStatus,
} from "@/app/departments/users/actions";

type SimpleAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

function useSubmit(action: SimpleAction) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await action(new FormData(e.currentTarget));
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  return { error, loading, submit };
}

export function AddUserForm() {
  const { error, loading, submit } = useSubmit(addApprovedUser);
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">صارف کا نام *</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            placeholder="مثلاً فاطمہ"
          />
        </label>
        <label className="field">
          <span className="field-label">Gmail *</span>
          <input
            className="field-input"
            name="email"
            type="email"
            dir="ltr"
            required
            maxLength={200}
            placeholder="you@gmail.com"
          />
        </label>
        <label className="field">
          <span className="field-label">واٹس ایپ نمبر</span>
          <input
            className="field-input"
            name="whatsapp"
            type="tel"
            dir="ltr"
            maxLength={20}
            placeholder="03xx-xxxxxxx"
          />
        </label>
        <label className="field">
          <span className="field-label">کردار *</span>
          <select
            className="field-input"
            name="role"
            required
            defaultValue="mudarris"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "براہِ کرم انتظار کریں…" : "صارف شامل کریں (منظور شدہ)"}
        </button>
      </div>
    </form>
  );
}

export function ApproveForm({ id }: { id: string }) {
  const { error, loading, submit } = useSubmit(approveUser);
  return (
    <form onSubmit={submit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <select
        className="field-input"
        name="role"
        required
        defaultValue="mudarris"
        style={{ width: "110px" }}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>{" "}
      <button className="btn-primary" type="submit" disabled={loading}>
        منظور کریں
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

export function StatusForm({
  id,
  status,
  label,
  primary,
}: {
  id: string;
  status: "approved" | "disabled";
  label: string;
  primary?: boolean;
}) {
  const { error, loading, submit } = useSubmit(setUserStatus);
  return (
    <form onSubmit={submit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        className={primary ? "btn-primary" : "btn-ghost"}
        type="submit"
        disabled={loading}
      >
        {label}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
