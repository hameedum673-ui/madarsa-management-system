/**
 * مرحلہ 9 — داخلہ درخواست کی تفصیل + منظوری / مسترد
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی درخواست کھل سکتی ہے۔
 * منظور ہونے پر طالبہ کا ریکارڈ بنتا ہے اور اس صفحے پر اس کا لنک آ جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { DEPARTMENT_LABELS } from "@/lib/students";
import { type Admission } from "@/lib/admissions";
import AdmissionActions from "@/app/departments/admissions/[id]/AdmissionActions";
import {
  approveAdmission,
  rejectAdmission,
} from "@/app/departments/admissions/actions";
import {
  admissionApprovedMessage,
  getMadrasaNameForMessage,
  messagePhone,
  whatsappLink,
} from "@/lib/whatsapp";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("admissions")
    .select("*, students(registration_number)")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const admission = data as Admission & {
    students: { registration_number: string } | null;
  };
  // مرحلہ 54 — بند شعبے کا داخلہ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(admission.section)) notFound();

  const madrasaName = await getMadrasaNameForMessage(supabase);
  const lang = await langP;

  // مرحلہ 44 — داخلہ منظور ہونے کا WhatsApp پیغام (صرف منظور شدہ پر)
  const approvedLink =
    admission.status === "approved"
      ? whatsappLink(
          messagePhone(admission.guardian_phone, admission.whatsapp_number),
          admissionApprovedMessage({
            madrasaName,
            applicantName: admission.applicant_name,
            departmentLabel: DEPARTMENT_LABELS[admission.department],
            className: admission.class_name ?? "—",
            registrationNumber:
              admission.students?.registration_number ?? "—",
          }),
        )
      : null;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/admissions" />
          <h2>{admission.applicant_name}</h2>
          <span
            className={`badge${admission.status === "rejected" ? " badge-withdrawn" : ""}`}
          >
            {t(lang, `admission.status.${admission.status}`)}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.father")}</span>
            <span>{admission.father_name}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.dept")}</span>
            <span>{t(lang, `dept.${admission.department}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>{t(lang, `section.${admission.section}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.class")}</span>
            <span>{admission.class_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.detail.admission_type")}</span>
            <span>{t(lang, `admission.type.${admission.admission_type}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.detail.admission_date")}</span>
            <span>{formatDate(admission.admission_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.dob")}</span>
            <span>{formatDate(admission.date_of_birth)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.detail.guardian")}</span>
            <span>{admission.guardian_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.phone")}</span>
            <span dir="ltr">{admission.guardian_phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "student.form.whatsapp")}</span>
            <span dir="ltr">{admission.whatsapp_number ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "admission.detail.prev_madrasa")}</span>
            <span>{admission.previous_madrasa ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "admission.detail.request_date")}</span>
            <span>{formatDate(admission.created_at)}</span>
          </div>
          {admission.note ? (
            <div className="row">
              <span>{t(lang, "admission.form.note_label")}</span>
              <span>{admission.note}</span>
            </div>
          ) : null}
          {admission.status === "approved" && admission.student_id ? (
            <div className="row">
              <span>{t(lang, "admission.detail.student_record")}</span>
              <span>
                <Link href={`/departments/students/${admission.student_id}`}>
                  {t(lang, "admission.detail.reg_link", {
                    reg: admission.students?.registration_number ?? "—",
                  })}
                </Link>
              </span>
            </div>
          ) : null}
        </div>

        {admission.status === "approved" ? (
          <>
            <h3 className="form-section-title">{t(lang, "admission.detail.notify_title")}</h3>
            {approvedLink ? (
              <div className="form-actions">
                <a
                  className="btn-primary"
                  href={approvedLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(lang, "admission.detail.send_msg")}
                </a>
              </div>
            ) : (
              <p className="empty-state">{t(lang, "admission.detail.no_phone")}</p>
            )}
            <p className="sub">{t(lang, "admission.detail.wa_note")}</p>
          </>
        ) : null}

        {admission.status === "pending" ? (
          <>
            <h3 className="form-section-title">{t(lang, "admission.detail.decide")}</h3>
            <p className="form-note">{t(lang, "admission.detail.decide_note")}</p>
            <AdmissionActions
              id={admission.id}
              approve={approveAdmission}
              reject={rejectAdmission}
              lang={lang}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
