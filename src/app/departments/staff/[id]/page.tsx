/**
 * مرحلہ 13 — عملے کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا عملہ کھل سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import type { StaffMember } from "@/lib/staff";
import StaffForm from "@/app/departments/staff/StaffForm";
import { updateStaff } from "@/app/departments/staff/actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const member = data as StaffMember;
  // مرحلہ 54 — بند شعبے کا ریکارڈ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(member.section)) notFound();
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/staff" />
          <h2>{member.name}</h2>
          <span
            className={`badge${member.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {t(lang, `person.status.${member.status}`)}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.father")}</span>
            <span>{member.father_name}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.dept")}</span>
            <span>{t(lang, `dept.${member.department}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>{t(lang, `section.${member.section}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.position_work")}</span>
            <span>{member.position ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.detail.joining")}</span>
            <span>{formatDate(member.joining_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.form.phone")}</span>
            <span dir="ltr">{member.phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.form.cnic")}</span>
            <span dir="ltr">{member.cnic ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "teacher.form.qualification")}</span>
            <span>{member.qualification ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.address")}</span>
            <span>{member.address ?? "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">{t(lang, "student.detail.edit_title")}</h3>
        <StaffForm
          initial={member}
          action={updateStaff.bind(null, member.id)}
          submitLabel={t(lang, "student.form.update")}
          cancelHref="/departments/staff"
          showStatus
          lang={lang}
        />

      </div>
    </div>
  );
}
