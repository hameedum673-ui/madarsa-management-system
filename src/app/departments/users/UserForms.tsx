/**
 * مرحلہ 11 — صارفین کی منظوری کے فارم (کلائنٹ)
 * ہر فارم سرور ایکشن چلاتا ہے؛ غلطی ہو تو اردو پیغام دکھاتا ہے،
 * کامیابی پر فہرست تازہ کرتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSIGNABLE_ROLES } from "@/lib/approval";
import { t, type Lang } from "@/i18n/dictionary";
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

export function AddUserForm({ lang = "ur" }: { lang?: Lang }) {
  const { error, loading, submit } = useSubmit(addApprovedUser);
  return (
    <form onSubmit={submit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "user.form.name")}</span>
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
          <span className="field-label">{t(lang, "user.form.email")}</span>
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
          <span className="field-label">
            {t(lang, "user.form.whatsapp")}
          </span>
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
          <span className="field-label">{t(lang, "user.form.role")}</span>
          <select
            className="field-input"
            name="role"
            required
            defaultValue="mudarris"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {t(lang, `role.${r}`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.waiting") : t(lang, "user.form.add")}
        </button>
      </div>
    </form>
  );
}

export function ApproveForm({ id, lang = "ur" }: { id: string; lang?: Lang }) {
  const { error, loading, submit } = useSubmit(approveUser);
  return (
    <form onSubmit={submit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="lang" value={lang} />
      <select
        className="field-input"
        name="role"
        required
        defaultValue="mudarris"
        style={{ width: "110px" }}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r} value={r}>
            {t(lang, `role.${r}`)}
          </option>
        ))}
      </select>{" "}
      <button className="btn-primary" type="submit" disabled={loading}>
        {t(lang, "user.form.approve")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}

/** مرحلہ 81 — صارف کو ایڈمن بنائیں (دو قدمی تصدیق) */
export function PromoteAdminForm({
  id,
  lang = "ur",
}: {
  id: string;
  lang?: Lang;
}) {
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
    formData.set("lang", lang);
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
          ? t(lang, "common.waiting")
          : confirming
            ? t(lang, "user.form.make_admin_confirm")
            : t(lang, "user.form.make_admin")}
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </span>
  );
}

/** مرحلہ 81 — ایڈمن ختم کریں (نیا کردار چن کر؛ دو قدمی تصدیق) */
export function DemoteAdminForm({
  id,
  lang = "ur",
}: {
  id: string;
  lang?: Lang;
}) {
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
    formData.set("lang", lang);
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
            {t(lang, `role.${r}`)}
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
          ? t(lang, "common.waiting")
          : confirming
            ? t(lang, "user.form.remove_admin_confirm")
            : t(lang, "user.form.remove_admin")}
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
  lang = "ur",
}: {
  id: string;
  status: "approved" | "disabled";
  label: string;
  primary?: boolean;
  lang?: Lang;
}) {
  const { error, loading, submit } = useSubmit(setUserStatus);
  return (
    <form onSubmit={submit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="lang" value={lang} />
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
export function TransferWorkspaceForm({ lang = "ur" }: { lang?: Lang }) {
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
        setError(t(lang, "user.err.both_emails"));
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
    formData.set("lang", lang);
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
          {t(lang, "user.form.old_email")}
          <input
            type="email"
            dir="ltr"
            value={oldEmail}
            onChange={(e) => setOldEmail(e.target.value)}
            placeholder="old@gmail.com"
          />
        </label>
        <label>
          {t(lang, "user.form.new_email")}
          <input
            type="email"
            dir="ltr"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@gmail.com"
          />
        </label>
      </div>
      <p className="form-note">{t(lang, "user.form.transfer_note")}</p>
      <button
        type="button"
        className="btn-primary"
        onClick={handleClick}
        disabled={loading}
      >
        {loading
          ? t(lang, "common.waiting")
          : confirming
            ? t(lang, "user.form.transfer_confirm")
            : t(lang, "user.form.transfer")}
      </button>
      {confirming ? (
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          {t(lang, "common.cancel")}
        </button>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {done ? (
        <p className="form-note">{t(lang, "user.form.transfer_done")}</p>
      ) : null}
    </div>
  );
}
