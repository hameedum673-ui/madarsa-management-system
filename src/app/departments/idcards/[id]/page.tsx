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
  getMyMadrasa,
  type Student,
} from "@/lib/students";
import { todayInKarachi } from "@/lib/attendance";
import SaveImageButton from "@/app/departments/idcards/[id]/SaveImageButton";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

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
  const langP = getMyLanguage();

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const lang = await langP;
  if (tableMissing) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="back-arrow-row">
            <BackButton href="/departments/idcards" />
          </div>
          <p className="empty-state">{t(lang, "students.table_missing")}</p>
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
            <h2>{t(lang, "idcard.title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "idcard.withdrawn")}</p>
        </div>
      </div>
    );
  }

  // مدرسے کا نام کارڈ پر دکھانے کے لیے
  let madrasaName = t(lang, "app.name");
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
          <h2>{t(lang, "idcard.title")}</h2>
          <span className="page-count">{student.registration_number}</span>
        </div>

        <div className="idcard">
          <div className="idcard-head">
            <strong>{madrasaName}</strong>
            <div className="idcard-sub">شادی لارج، ضلع بدین، سندھ</div>
            <div className="idcard-title">{t(lang, "idcard.title")}</div>
          </div>

          <div className="idcard-body">
            <div className="idcard-photo">{t(lang, "idcard.photo_ph")}</div>
            <div className="idcard-fields">
              <div className="idcard-reg">
                <span>{t(lang, "col.reg")}</span>
                <strong>{student.registration_number}</strong>
              </div>
              <div className="idcard-rows">
                <div className="row">
                  <span>{t(lang, "col.name")}</span>
                  <span>{student.name}</span>
                </div>
                <div className="row">
                  <span>{t(lang, "col.father")}</span>
                  <span>{student.father_name}</span>
                </div>
                <div className="row">
                  <span>{t(lang, "col.dept")}</span>
                  <span>{t(lang, "dept." + student.department)}</span>
                </div>
                <div className="row">
                  <span>{t(lang, "col.class")}</span>
                  <span>{student.class_name ?? "—"}</span>
                </div>
                <div className="row">
                  <span>{t(lang, "exam.result.dob")}</span>
                  <span>{formatDate(student.date_of_birth)}</span>
                </div>
                <div className="row">
                  <span>{t(lang, "idcard.admission_date")}</span>
                  <span>{formatDate(student.admission_date)}</span>
                </div>
                <div className="row">
                  <span>{t(lang, "idcard.guardian_phone")}</span>
                  <span>{student.guardian_phone ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="idcard-foot">
            <span>{t(lang, "idcard.issued_date", { date: issueDate })}</span>
            <span>{t(lang, "idcard.property")}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveImageButton
            lang={lang}
            data={{
              madrasaName,
              name: student.name,
              fatherName: student.father_name,
              registrationNumber: student.registration_number,
              departmentLabel: t(lang, "dept." + student.department),
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
