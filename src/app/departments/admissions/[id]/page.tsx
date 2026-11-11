/**
 * مرحلہ 9 — داخلہ درخواست کی تفصیل + منظوری / مسترد
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی درخواست کھل سکتی ہے۔
 * منظور ہونے پر طالبہ کا ریکارڈ بنتا ہے اور اس صفحے پر اس کا لنک آ جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_LABELS } from "@/lib/students";
import {
  ADMISSION_STATUS_LABELS,
  type Admission,
} from "@/lib/admissions";
import AdmissionActions from "@/app/departments/admissions/[id]/AdmissionActions";
import {
  approveAdmission,
  rejectAdmission,
} from "@/app/departments/admissions/actions";
import {
  admissionApprovedMessage,
  getMadrasaNameForMessage,
  whatsappLink,
} from "@/lib/whatsapp";

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

  const madrasaName = await getMadrasaNameForMessage(supabase);

  // مرحلہ 44 — داخلہ منظور ہونے کا WhatsApp پیغام (صرف منظور شدہ پر)
  const approvedLink =
    admission.status === "approved"
      ? whatsappLink(
          admission.guardian_phone,
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
            {ADMISSION_STATUS_LABELS[admission.status]}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>والد کا نام</span>
            <span>{admission.father_name}</span>
          </div>
          <div className="row">
            <span>شعبہ</span>
            <span>{DEPARTMENT_LABELS[admission.department]}</span>
          </div>
          <div className="row">
            <span>جماعت</span>
            <span>{admission.class_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>داخلہ کی تاریخ</span>
            <span>{formatDate(admission.admission_date)}</span>
          </div>
          <div className="row">
            <span>تاریخِ پیدائش</span>
            <span>{formatDate(admission.date_of_birth)}</span>
          </div>
          <div className="row">
            <span>سرپرست</span>
            <span>{admission.guardian_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>سرپرست کا فون</span>
            <span dir="ltr">{admission.guardian_phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>پچھلا مدرسہ</span>
            <span>{admission.previous_madrasa ?? "—"}</span>
          </div>
          <div className="row">
            <span>درخواست کی تاریخ</span>
            <span>{formatDate(admission.created_at)}</span>
          </div>
          {admission.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{admission.note}</span>
            </div>
          ) : null}
          {admission.status === "approved" && admission.student_id ? (
            <div className="row">
              <span>طالبہ کا ریکارڈ</span>
              <span>
                <Link href={`/departments/students/${admission.student_id}`}>
                  رجسٹریشن نمبر{" "}
                  {admission.students?.registration_number ?? "—"} — ریکارڈ
                  دیکھیں
                </Link>
              </span>
            </div>
          ) : null}
        </div>

        {admission.status === "approved" ? (
          <>
            <h3 className="form-section-title">والدین کو اطلاع دیں</h3>
            {approvedLink ? (
              <div className="form-actions">
                <a
                  className="btn-primary"
                  href={approvedLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  داخلہ منظور ہونے کا پیغام بھیجیں
                </a>
              </div>
            ) : (
              <p className="empty-state">
                سرپرست کا فون نمبر درج نہیں ہے، اس لیے WhatsApp پیغام نہیں
                بھیجا جا سکتا۔
              </p>
            )}
            <p className="sub">
              بٹن دبانے سے WhatsApp کھل جائے گا، نمبر اور پیغام پہلے سے لکھا
              ہوگا؛ بھیجنے کا بٹن آپ خود WhatsApp میں دبائیں گے۔
            </p>
          </>
        ) : null}

        {admission.status === "pending" ? (
          <>
            <h3 className="form-section-title">فیصلہ کریں</h3>
            <p className="form-note">
              منظور کرنے پر طالبہ کا ریکارڈ خود بن جائے گا (رجسٹریشن نمبر
              خودکار)۔ مسترد کرنے پر کوئی طالبہ نہیں بنے گی۔
            </p>
            <AdmissionActions
              id={admission.id}
              approve={approveAdmission}
              reject={rejectAdmission}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
