/**
 * مرحلہ 4 — طالبہ کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی طالبہ کھل سکتی ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  type Student,
} from "@/lib/students";
import StudentForm from "@/app/departments/students/StudentForm";
import { updateStudent } from "@/app/departments/students/actions";
import { getActiveClasses } from "@/lib/classes";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const student = data as Student;
  // مرحلہ 54 — بند شعبے کا ریکارڈ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(student.section)) notFound();
  const classes = await getActiveClasses(supabase);
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/students" />
          <h2>
            {student.name} — {student.registration_number}
          </h2>
          <span
            className={`badge${student.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {t(lang, `student.status.${student.status}`)}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.reg")}</span>
            <span>{student.registration_number}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.father")}</span>
            <span>{student.father_name}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.dept")}</span>
            <span>{t(lang, `dept.${student.department}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>{t(lang, `section.${student.section}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.class")}</span>
            <span>{student.class_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.detail.admission_type")}</span>
            <span>{t(lang, `admission.type.${student.admission_type}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.detail.admission_date")}</span>
            <span>{formatDate(student.admission_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.dob")}</span>
            <span>{formatDate(student.date_of_birth)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.detail.guardian")}</span>
            <span>{student.guardian_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.phone")}</span>
            <span dir="ltr">{student.guardian_phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.whatsapp")}</span>
            <span dir="ltr">{student.whatsapp_number ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.address")}</span>
            <span>{student.address ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.district")}</span>
            <span>{student.district ?? "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">{t(lang, "student.detail.edit_title")}</h3>
        <StudentForm
          initial={student}
          action={updateStudent.bind(null, student.id)}
          submitLabel={t(lang, "student.form.update")}
          cancelHref="/departments/students"
          showStatus
          classes={classes}
          lang={lang}
        />

      </div>
    </div>
  );
}
