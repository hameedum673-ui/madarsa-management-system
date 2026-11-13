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
  setUserRole,
  setUserStatus,
  transferWorkspace,
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

/** مرحلہ 81 — صارف کو ایڈمن بنائیں (دو قدمی تصدیق) */
export function PromoteAdminForm({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError("");
    setLoading(true);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("role", "super_admin");
    const res = await setUserRole(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button
        type="button"
        className="btn-ghost"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? "براہِ کرم انتظار کریں…"
          : confirming
            ? "پکا ایڈمن بنائیں؟"
            : "ایڈمن بنائیں"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}

/** مرحلہ 81 — ایڈمن ختم کریں (نیا کردار چن کر؛ دو قدمی تصدیق) */
export function DemoteAdminForm({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState("clerk");

  async function handleClick() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setError("");
    setLoading(true);
    const formData = new FormData();
    formData.set("id", id);
    formData.set("role", role);
    const res = await setUserRole(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <select
        className="field-input"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ width: "110px" }}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>{" "}
      <button
        type="button"
        className="btn-ghost"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? "براہِ کرم انتظار کریں…"
          : confirming
            ? "پکا ختم کریں؟"
            : "ایڈمن ختم کریں"}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
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

/** مرحلہ 82 — Gmail بدلنا (منتقلی) — دو قدمی تصدیق */
export function TransferWorkspaceForm() {
  const router = useRouter();
  const [oldEmail, setOldEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirming) {
      if (!oldEmail.trim() || !newEmail.trim()) {
        setError("دونوں Gmail لکھیں۔");
        return;
      }
      setError("");
      setConfirming(true);
      return;
    }
    setError("");
    setLoading(true);
    const formData = new FormData();
    formData.set("old_email", oldEmail.trim());
    formData.set("new_email", newEmail.trim());
    const res = await transferWorkspace(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      setConfirming(false);
      return;
    }
    setDone(true);
    setConfirming(false);
    router.refresh();
  }

  return (
    <div>
      <div className="form-grid">
        <label>
          پرانی Gmail (جسے بدلنا ہے)
          <input
            type="email"
            dir="ltr"
            value={oldEmail}
            onChange={(e) => setOldEmail(e.target.value)}
            placeholder="old@gmail.com"
          />
        </label>
        <label>
          نئی Gmail (جس پر مدرسہ جائے گا)
          <input
            type="email"
            dir="ltr"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@gmail.com"
          />
        </label>
      </div>
      <p className="form-note">
        نئی Gmail پہلے ایک بار لاگ ان کر کے منظور ہوئی ہونی چاہیے، اور
        اس کا اپنا مدرسہ خالی ہونا چاہیے۔ منتقلی کے بعد پرانی Gmail بند
        ہو جائے گی؛ نئی Gmail پر 2FA الگ سے لگانا ہوگا۔ اگر آپ اپنی ہی
        Gmail منتقل کر رہے ہیں تو اس کے بعد نئی Gmail سے لاگ ان کریں۔
      </p>
      <button
        type="button"
        className="btn-primary"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? "براہِ کرم انتظار کریں…"
          : confirming
            ? "پکا منتقل کریں؟ پرانی Gmail بند ہو جائے گی"
            : "منتقل کریں"}
      </button>
      {confirming ? (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          منسوخ کریں
        </button>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {done ? (
        <p className="form-note">
          منتقلی ہو گئی — اب نئی Gmail سے لاگ ان کریں، پرانا مدرسہ ویسا
          ہی ملے گا۔
        </p>
      ) : null}
    </div>
  );
}
