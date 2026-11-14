/**
 * مرحلہ 4 — طالبہ کا فارم (نئی طالبہ / تبدیلی، دونوں کے لیے ایک ہی فارم)
 * اردو RTL، موبائل پر آسان۔ رجسٹریشن نمبر سرور خود لگاتا ہے، یہاں نہیں پوچھا جاتا۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClassSelect from "@/components/ClassSelect";
import type { ClassOption } from "@/lib/classes";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type DepartmentId,
  type SectionId,
  type Student,
} from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true } | { error: string }>;

export default function StudentForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  showStatus,
  classes = [],
  lang = "ur",
}: {
  initial?: Partial<Student>;
  action: FormAction;
  submitLabel: string;
  cancelHref: string;
  showStatus?: boolean;
  classes?: ClassOption[];
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // مرحلہ 36 — شعبہ بدلنے پر جماعت کی فہرست بھی بدلے
  const [department, setDepartment] = useState<DepartmentId>(
    initial?.department ?? "hifz",
  );
  // مرحلہ 51 — بنین / بنات (موجودہ مدرسہ للبنات ہے، اس لیے پہلے سے "بنات")
  const [section, setSection] = useState<SectionId>(
    initial?.section ?? "banat",
  );

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
    router.push("/departments/students");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "student.form.name")}</span>
          <input
            className="field-input"
            name="name"
            type="text"
            required
            maxLength={100}
            defaultValue={initial?.name ?? ""}
            placeholder={t(lang, "student.form.name_ph")}
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
            value={department}
            onChange={(e) => setDepartment(e.target.value as DepartmentId)}
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
            value={section}
            onChange={(e) => setSection(e.target.value as SectionId)}
          >
            {SECTION_IDS.map((s) => (
              <option key={s} value={s}>
                {t(lang, `section.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <ClassSelect
          classes={classes}
          department={department}
          section={section}
          initialClassName={initial?.class_name ?? null}
          lang={lang}
        />

        <label className="field">
          <span className="field-label">{t(lang, "student.form.admission_date")}</span>
          <input
            className="field-input"
            name="admission_date"
            type="date"
            required
            defaultValue={initial?.admission_date ?? today}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.dob")}</span>
          <input
            className="field-input"
            name="date_of_birth"
            type="date"
            defaultValue={initial?.date_of_birth ?? ""}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.guardian")}</span>
          <input
            className="field-input"
            name="guardian_name"
            type="text"
            maxLength={100}
            defaultValue={initial?.guardian_name ?? ""}
            placeholder={t(lang, "student.form.guardian_ph")}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.phone")}</span>
          <input
            className="field-input"
            name="guardian_phone"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial?.guardian_phone ?? ""}
            placeholder="03xx-xxxxxxx"
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.whatsapp")}</span>
          <input
            className="field-input"
            name="whatsapp_number"
            type="tel"
            dir="ltr"
            maxLength={20}
            defaultValue={initial?.whatsapp_number ?? ""}
            placeholder="03xx-xxxxxxx"
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

      <label className="field">
        <span className="field-label">{t(lang, "student.form.district")}</span>
        <input
          className="field-input"
          name="district"
          type="text"
          maxLength={100}
          defaultValue={initial?.district ?? ""}
          placeholder={t(lang, "student.form.district_ph")}
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
            <option value="active">{t(lang, "student.status.active")}</option>
            <option value="withdrawn">{t(lang, "student.status.withdrawn")}</option>
          </select>
        </label>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      <p className="form-note">{t(lang, "student.form.note")}</p>

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
