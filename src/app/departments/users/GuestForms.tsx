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
  saveGuestSettings,
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

export function GuestSettingsForm({
  allowGuests,
  guestHours,
}: {
  allowGuests: boolean;
  guestHours: number;
}) {
  const { error, loading, submit } = useSubmit(saveGuestSettings);
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <label className="field">
          <span className="field-label">مہمان رسائی</span>
          <span>
            <input
              name="allow_guests"
              type="checkbox"
              defaultChecked={allowGuests}
            />{" "}
            آن کریں — لاگ ان والے صفحے پر "ڈیمو دیکھیں" کا بٹن نظر آئے گا
          </span>
        </label>
        <label className="field">
          <span className="field-label">نئے مہمان کے لیے گھنٹے *</span>
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
        {loading ? "براہِ کرم انتظار کریں…" : "ترتیب محفوظ کریں"}
      </button>
      <p className="form-note">
        بند ہو تو ڈیمو بٹن غائب ہو جاتا ہے؛ جو مہمان اندر ہیں، ان کی رسائی
        بھی بند ہو جاتی ہے۔ گھنٹے بدلنے پر پرانے مہمانوں کا وقت نہیں بدلتا،
        صرف نئے مہمانوں کا۔
      </p>
    </form>
  );
}

export function CloseGuestForm({ id }: { id: string }) {
  const { error, loading, submit } = useSubmit(closeGuest);
  return (
    <form onSubmit={submit}>
      <input type="hidden" name="id" value={id} />
      <button className="btn-ghost" type="submit" disabled={loading}>
        {loading ? "براہِ کرم انتظار کریں…" : "ابھی بند کریں"}
      </button>
      {error ? <p className="login11-error">{error}</p> : null}
    </form>
  );
}
