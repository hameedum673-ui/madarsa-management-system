/**
 * مرحلہ 5 — استاد کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا استاد کھل سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import type { Teacher } from "@/lib/teachers";
import TeacherForm from "@/app/departments/teachers/TeacherForm";
import { updateTeacher } from "@/app/departments/teachers/actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const teacher = data as Teacher;
  // مرحلہ 54 — بند شعبے کا ریکارڈ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(teacher.section)) notFound();
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/teachers" />
          <h2>{teacher.name}</h2>
          <span
            className={`badge${teacher.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {t(lang, `person.status.${teacher.status}`)}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.father")}</span>
            <span>{teacher.father_name}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.dept")}</span>
            <span>{t(lang, `dept.${teacher.department}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>{t(lang, `section.${teacher.section}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.position")}</span>
            <span>{teacher.position ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.detail.joining")}</span>
            <span>{formatDate(teacher.joining_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.form.phone")}</span>
            <span dir="ltr">{teacher.phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.form.cnic")}</span>
            <span dir="ltr">{teacher.cnic ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.form.qualification")}</span>
            <span>{teacher.qualification ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.address")}</span>
            <span>{teacher.address ?? "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">{t(lang, "student.detail.edit_title")}</h3>
        <TeacherForm
          initial={teacher}
          action={updateTeacher.bind(null, teacher.id)}
          submitLabel={t(lang, "student.form.update")}
          cancelHref="/departments/teachers"
          showStatus
          lang={lang}
        />

      </div>
    </div>
  );
}
