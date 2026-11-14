/**
 * مرحلہ 13 — عملے کا فارم (نیا عملہ / تبدیلی، دونوں کے لیے ایک ہی فارم)
 * اردو RTL، موبائل پر آسان۔ تنخواہ اس فارم میں نہیں ہے۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
} from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";
import type { StaffMember } from "@/lib/staff";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function StaffForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  showStatus,
  lang = "ur",
}: {
  initial?: Partial<StaffMember>;
  action: FormAction;
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await action(formData);
    setLoading(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    router.push("/departments/staff");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "staff.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.name ?? ""}
            placeholder={t(lang, "staff.form.name_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.father")}</span>
          <input
            className="field-input"
            name="father_name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.father_name ?? ""}
            placeholder={t(lang, "student.form.father_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.dept")}</span>
          <select
            className="field-input"
            name="department"
            required
            defaultValue={initial?.department ?? "hifz"}
          >
            {DEPARTMENT_IDS.map((d) => (
              <option key={d} value={d}>
                {t(lang, `dept.${d}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.section")}</span>
          <select
            className="field-input"
            name="section"
            required
            defaultValue={initial?.section ?? "banat"}
          >
            {SECTION_IDS.map((s) => (
              <option key={s} value={s}>
                {t(lang, `section.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "staff.form.position")}</span>
          <input
            className="field-input"
            name="position"
            type="text"
            maxLength={100}
            defaultValue={initial?.position ?? ""}
            placeholder={t(lang, "staff.form.position_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "teacher.form.joining")}</span>
          <input
            className="field-input"
            name="joining_date"
            type="date"
            required
            defaultValue={initial?.joining_date ?? today}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "teacher.form.phone")}</span>
          <input
            className="field-input"
            name="phone"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial?.phone ?? ""}
            placeholder="03xx-xxxxxxx"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "teacher.form.cnic")}</span>
          <input
            className="field-input"
            name="cnic"
            type="text"
            dir="ltr"
            maxLength={15}
            defaultValue={initial?.cnic ?? ""}
            placeholder="xxxxx-xxxxxxx-x"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "teacher.form.qualification")}</span>
          <input
            className="field-input"
            name="qualification"
            type="text"
            maxLength={200}
            defaultValue={initial?.qualification ?? ""}
            placeholder={t(lang, "staff.form.qualification_ph")}
          />
        </label>
      </div>

      <label className="field">
        <span className="field-label">{t(lang, "student.form.address")}</span>
        <textarea
          className="field-input field-textarea"
          name="address"
          maxLength={500}
          defaultValue={initial?.address ?? ""}
          placeholder={t(lang, "student.form.address_ph")}
        />
      </label>

      {showStatus ? (
        <label className="field">
          <span className="field-label">{t(lang, "student.form.status")}</span>
          <select
            className="field-input"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">{t(lang, "person.status.active")}</option>
            <option value="withdrawn">{t(lang, "person.status.withdrawn")}</option>
          </select>
        </label>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : submitLabel}
        </button>
        <Link className="btn-ghost" href={cancelHref}>
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
