/**
 * مرحلہ 14 — جماعت کا فارم (نئی جماعت / تبدیلی، دونوں کے لیے ایک ہی فارم)
 * اردو RTL، موبائل پر آسان۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
} from "@/lib/students";
import type { MadrasaClass } from "@/lib/classes";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function ClassForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  showStatus,
  lang = "ur",
}: {
  initial?: Partial<MadrasaClass>;
  action: FormAction;
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    router.push("/departments/classes");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "class.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.name ?? ""}
            placeholder={t(lang, "class.form.name_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "class.form.dept")}</span>
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
          <span className="field-label">{t(lang, "class.form.section")}</span>
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
          <span className="field-label">
            {t(lang, "class.form.sort_order")}
          </span>
          <input
            className="field-input"
            name="sort_order"
            type="number"
            dir="ltr"
            required
            min={1}
            max={999}
            defaultValue={initial?.sort_order ?? 1}
          />
        </label>
      </div>

      {showStatus ? (
        <label className="field">
          <span className="field-label">{t(lang, "col.status")}</span>
          <select
            className="field-input"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
          >
            <option value="active">{t(lang, "class.status.active")}</option>
            <option value="inactive">
              {t(lang, "class.status.inactive")}
            </option>
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
