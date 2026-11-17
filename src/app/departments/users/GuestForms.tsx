/**
 * مرحلہ 67 — مہمان رسائی کے فارم (کلائنٹ، صرف ایڈمن)
 * سوئچ + گھنٹے محفوظ کرنا، اور کسی مہمان کی رسائی ابھی بند کرنا۔
 * ہر فارم سرور ایکشن چلاتا ہے؛ غلطی ہو تو اردو پیغام دکھاتا ہے،
 * کامیابی پر فہرست تازہ کرتا ہے۔
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  closeGuest,
  deleteGuest,
  saveGuestSettings,
} from "@/app/departments/users/actions";
import { t, type Lang } from "@/i18n/dictionary";

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

export function GuestSettingsForm({
  allowGuests,
  guestHours,
  lang = "ur",
}: {
  allowGuests: boolean;
  guestHours: number;
  lang?: Lang;
}) {
  const { error, loading, submit } = useSubmit(saveGuestSettings);
  return (
    <form onSubmit={submit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "guest.form.access")}</span>
          <span>
            <input
              name="allow_guests"
              type="checkbox"
              defaultChecked={allowGuests}
            />{" "}
            {t(lang, "guest.form.access_note")}
          </span>
        </label>
        <label className="field">
          <span className="field-label">{t(lang, "guest.form.hours")}</span>
          <input
            className="field-input"
            name="guest_hours"
            type="number"
            min={1}
            max={24}
            step={1}
            defaultValue={guestHours}
            required
          />
        </label>
      </div>
      {error ? <p className="login11-error">{error}</p> : null}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? t(lang, "common.waiting") : t(lang, "guest.form.save")}
      </button>
      <p className="form-note">{t(lang, "guest.form.note")}</p>
    </form>
  );
}

export function CloseGuestForm({
  id,
  lang = "ur",
}: {
  id: string;
  lang?: Lang;
}) {
  const { error, loading, submit } = useSubmit(closeGuest);
  return (
    <form onSubmit={submit}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="lang" value={lang} />
      <button className="btn-ghost" type="submit" disabled={loading}>
        {loading ? t(lang, "common.waiting") : t(lang, "guest.close")}
      </button>
      {error ? <p className="login11-error">{error}</p> : null}
    </form>
  );
}

export function DeleteGuestForm({
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
    const res = await deleteGuest(id, lang);
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
            ? t(lang, "guest.delete_confirm")
            : t(lang, "guest.delete")}
      </button>
      {error ? <p className="login11-error">{error}</p> : null}
    </span>
  );
}
