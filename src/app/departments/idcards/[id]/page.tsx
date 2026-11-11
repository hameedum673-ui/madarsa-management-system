/**
 * مرحلہ 12 — ایک طالبہ کا شناختی کارڈ (سرور صفحہ)
 * کارڈ طلبہ کی موجودہ میز سے بنتا ہے — نام ایک جگہ بدلیں تو کارڈ پر بھی
 * نیا نام آتا ہے، کیونکہ نام کہیں نقل نہیں کیا جاتا۔
 * کارڈ پرچی جیسا چھوٹا ہے (تنگ اور لمبا)؛ "تصویر محفوظ کریں" سے کارڈ PNG
 * تصویر کے طور پر محفوظ ہوتا ہے — کوئی PDF نہیں بنتا۔
 * خارج شدہ طالبہ کا کارڈ نہیں بنتا۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_LABELS,
  getMyMadrasa,
  type Student,
} from "@/lib/students";
import { todayInKarachi } from "@/lib/attendance";
import SaveImageButton from "@/app/departments/idcards/[id]/SaveImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function IdCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  if (tableMissing) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="back-arrow-row">
            <BackButton href="/departments/idcards" />
          </div>
          <p className="empty-state">
            طلبہ کی میز ابھی نہیں بنی — پہلے مرحلہ 4 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) notFound();

  const student = data as Student;
  // مرحلہ 54 — بند شعبے کا ریکارڈ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(student.section)) notFound();

  if (student.status === "withdrawn") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/idcards" />
            <h2>طالبہ کا شناختی کارڈ</h2>
          </div>
          <p className="empty-state">
            یہ طالبہ خارج ہے — اس کا شناختی کارڈ نہیں بنے گا۔
          </p>
        </div>
      </div>
    );
  }

  // مدرسے کا نام کارڈ پر دکھانے کے لیے
  let madrasaName = "مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات";
  const mine = await getMyMadrasa(supabase);
  if (mine) {
    const { data: madrasa } = await supabase
      .from("madrasas")
      .select("name")
      .eq("id", mine.madrasaId)
      .single();
    if (madrasa?.name) madrasaName = madrasa.name as string;
  }

  const issueDate = formatDate(todayInKarachi());

  return (
    <div className="module-view open">
      <div className="page-card idcard-page">
        <div className="page-head no-print">
          <BackButton href="/departments/idcards" className="no-print" />
          <h2>طالبہ کا شناختی کارڈ</h2>
          <span className="page-count">{student.registration_number}</span>
        </div>

        <div className="idcard">
          <div className="idcard-head">
            <strong>{madrasaName}</strong>
            <div className="idcard-sub">شادی لارج، ضلع بدین، سندھ</div>
            <div className="idcard-title">طالبہ کا شناختی کارڈ</div>
          </div>

          <div className="idcard-body">
            <div className="idcard-photo">تصویر یہاں چپکائیں</div>
            <div className="idcard-fields">
              <div className="idcard-reg">
                <span>رجسٹریشن نمبر</span>
                <strong>{student.registration_number}</strong>
              </div>
              <div className="idcard-rows">
                <div className="row">
                  <span>نام</span>
                  <span>{student.name}</span>
                </div>
                <div className="row">
                  <span>والد کا نام</span>
                  <span>{student.father_name}</span>
                </div>
                <div className="row">
                  <span>شعبہ</span>
                  <span>{DEPARTMENT_LABELS[student.department]}</span>
                </div>
                <div className="row">
                  <span>جماعت</span>
                  <span>{student.class_name ?? "—"}</span>
                </div>
                <div className="row">
                  <span>تاریخِ پیدائش</span>
                  <span>{formatDate(student.date_of_birth)}</span>
                </div>
                <div className="row">
                  <span>داخلہ تاریخ</span>
                  <span>{formatDate(student.admission_date)}</span>
                </div>
                <div className="row">
                  <span>سرپرست کا فون</span>
                  <span>{student.guardian_phone ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="idcard-foot">
            <span>جاری کرنے کی تاریخ: {issueDate}</span>
            <span>یہ کارڈ مدرسے کی ملکیت ہے</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveImageButton
            data={{
              madrasaName,
              name: student.name,
              fatherName: student.father_name,
              registrationNumber: student.registration_number,
              departmentLabel: DEPARTMENT_LABELS[student.department],
              className: student.class_name ?? "—",
              dateOfBirth: formatDate(student.date_of_birth),
              admissionDate: formatDate(student.admission_date),
              guardianPhone: student.guardian_phone ?? "—",
              issueDate,
            }}
          />
        </div>
      </div>
    </div>
  );
}
