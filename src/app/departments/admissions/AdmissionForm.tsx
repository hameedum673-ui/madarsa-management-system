/**
 * مرحلہ 9 — داخلہ درخواست کا فارم (نئی درخواست)
 * اردو RTL، موبائل پر آسان۔ حالت «زیرِ غور» سے شروع ہوتی ہے؛
 * منظوری تفصیل والے صفحے سے ہوتی ہے، یہاں نہیں۔
 * مرحلہ 74 — داخلے کی قسم: جدید (نئی طالبہ) / قدیم (واپس آنے
 * والی طالبہ — پرانی طالبہ چنیں، اس کی تفصیل خود بھر جائے گی)۔
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ClassSelect from "@/components/ClassSelect";
import type { ClassOption } from "@/lib/classes";
import {
  ADMISSION_TYPE_IDS,
} from "@/lib/admissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type AdmissionType,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";
import { t, type Lang } from "@/i18n/dictionary";

type FormAction = (
  formData: FormData,
) => Promise<{ ok: true; id: string } | { error: string }>;

export interface AdmissionStudent {
  id: string;
  name: string;
  father_name: string;
  registration_number: string;
  class_name: string | null;
  department: DepartmentId;
  section: SectionId;
  date_of_birth: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  whatsapp_number: string | null;
  district: string | null;
  status: string;
}

export default function AdmissionForm({
  action,
  classes = [],
  students = [],
  lang = "ur",
}: {
  action: FormAction;
  classes?: ClassOption[];
  students?: AdmissionStudent[];
  lang?: Lang;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // مرحلہ 36 — شعبہ بدلنے پر جماعت کی فہرست بھی بدلے
  const [department, setDepartment] = useState("hifz");
  // مرحلہ 51 — بنین / بنات (موجودہ مدرسہ للبنات ہے، اس لیے پہلے سے "بنات")
  const [section, setSection] = useState<SectionId>("banat");
  // مرحلہ 74 — داخلے کی قسم + پرانی طالبہ
  const [admissionType, setAdmissionType] = useState<AdmissionType>("new");
  const [studentId, setStudentId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [district, setDistrict] = useState("");

  const selectedStudent =
    students.find((s) => s.id === studentId) ?? null;
  const readOnlyDetails =
    admissionType === "returning" && selectedStudent !== null;

  const today = new Date().toISOString().slice(0, 10);

  function handleTypeChange(t: AdmissionType) {
    setAdmissionType(t);
    setStudentId("");
    setApplicantName("");
    setFatherName("");
    setDateOfBirth("");
    setGuardianName("");
    setGuardianPhone("");
    setWhatsappNumber("");
    setDistrict("");
  }

  function handleStudentChange(id: string) {
    setStudentId(id);
    const student = students.find((s) => s.id === id);
    if (!student) {
      setApplicantName("");
      setFatherName("");
      setDateOfBirth("");
      setGuardianName("");
      setGuardianPhone("");
      setWhatsappNumber("");
      setDistrict("");
      return;
    }
    setApplicantName(student.name);
    setFatherName(student.father_name);
    setDateOfBirth(student.date_of_birth ?? "");
    setGuardianName(student.guardian_name ?? "");
    setGuardianPhone(student.guardian_phone ?? "");
    setWhatsappNumber(student.whatsapp_number ?? "");
    setDistrict(student.district ?? "");
    setDepartment(student.department);
    setSection(student.section);
  }

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
    router.push(`/departments/admissions/${res.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="lang" value={lang} />
      <div className="form-grid">
        <label className="field">
          <span className="field-label">{t(lang, "admission.form.type")}</span>
          <select
            className="field-input"
            name="admission_type"
            required
            value={admissionType}
            onChange={(e) =>
              handleTypeChange(e.target.value as AdmissionType)
            }
          >
            {ADMISSION_TYPE_IDS.map((t2) => (
              <option key={t2} value={t2}>
                {t(lang, `admission.type.${t2}`)}
              </option>
            ))}
          </select>
        </label>

        {admissionType === "returning" ? (
          <label className="field">
            <span className="field-label">{t(lang, "admission.form.pick_old")}</span>
            <select
              className="field-input"
              value={studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              required
            >
              <option value="">{t(lang, "admission.form.pick_placeholder")}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.father_name} ({t(lang, "admission.form.reg_word")}{" "}
                  {s.registration_number})
                  {s.class_name ? ` — ${s.class_name}` : ""}
                  {s.status === "withdrawn" ? ` — ${t(lang, "student.status.withdrawn")}` : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <input
          type="hidden"
          name="student_id"
          value={admissionType === "returning" ? studentId : ""}
        />

        <label className="field">
          <span className="field-label">{t(lang, "student.form.name")}</span>
          <input
            className="field-input"
            name="applicant_name"
            type="text"
            required
            maxLength={100}
            placeholder={t(lang, "student.form.name_ph")}
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            readOnly={readOnlyDetails}
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
            placeholder={t(lang, "student.form.father_ph")}
            value={fatherName}
            onChange={(e) => setFatherName(e.target.value)}
            readOnly={readOnlyDetails}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.dept")}</span>
          <select
            className="field-input"
            name="department"
            required
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
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
          key={studentId || "new"}
          classes={classes}
          department={department}
          section={section}
          initialClassName={selectedStudent?.class_name ?? null}
          lang={lang}
        />

        <label className="field">
          <span className="field-label">{t(lang, "student.form.admission_date")}</span>
          <input
            className="field-input"
            name="admission_date"
            type="date"
            required
            defaultValue={today}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.dob")}</span>
          <input
            className="field-input"
            name="date_of_birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            readOnly={readOnlyDetails}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.guardian")}</span>
          <input
            className="field-input"
            name="guardian_name"
            type="text"
            maxLength={100}
            placeholder={t(lang, "student.form.guardian_ph")}
            value={guardianName}
            onChange={(e) => setGuardianName(e.target.value)}
            readOnly={readOnlyDetails}
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
            placeholder="03xx-xxxxxxx"
            value={guardianPhone}
            onChange={(e) => setGuardianPhone(e.target.value)}
            readOnly={readOnlyDetails}
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
            placeholder="03xx-xxxxxxx"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            readOnly={readOnlyDetails}
          />
        </label>

        <label className="field">
          <span className="field-label">{t(lang, "student.form.district")}</span>
          <input
            className="field-input"
            name="district"
            type="text"
            maxLength={100}
            placeholder={t(lang, "student.form.district_ph")}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          />
        </label>

        {admissionType === "new" ? (
          <label className="field">
            <span className="field-label">{t(lang, "admission.form.prev_madrasa")}</span>
            <input
              className="field-input"
              name="previous_madrasa"
              type="text"
              maxLength={200}
              placeholder={t(lang, "admission.form.prev_ph")}
            />
          </label>
        ) : null}
      </div>

      <label className="field">
        <span className="field-label">{t(lang, "admission.form.note_label")}</span>
        <textarea
          className="field-input field-textarea"
          name="note"
          maxLength={500}
          placeholder={t(lang, "admission.form.note_ph")}
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      {admissionType === "returning" ? (
        <p className="form-note">{t(lang, "admission.form.note_returning")}</p>
      ) : (
        <p className="form-note">{t(lang, "admission.form.note_new")}</p>
      )}

      <div className="form-actions">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? t(lang, "common.wait") : t(lang, "admission.form.submit")}
        </button>
        <Link className="btn-ghost" href="/departments/admissions">
          {t(lang, "common.cancel")}
        </Link>
      </div>
    </form>
  );
}
