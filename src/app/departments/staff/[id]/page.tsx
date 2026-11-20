/**
 * مرحلہ 13 — عملے کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا عملہ کھل سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import {
  buildTeacherAttendanceHistory,
  type AttendanceStatus,
  type TeacherAttendanceHistory,
} from "@/lib/attendance";
import StaffHistory from "@/app/departments/staff/[id]/StaffHistory";
import type { SalaryHistoryRow } from "@/app/departments/teachers/[id]/TeacherHistory";
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

  // عملے کی تاریخ — حاضری سب کو، تنخواہیں صرف مالک کے لیے
  // (تنخواہوں والا صفحہ بھی صرف مالک کا ہے)؛ نہ ملے تو خالی
  let att: TeacherAttendanceHistory = {
    months: [],
    present: 0,
    absent: 0,
    leave: 0,
    sick: 0,
    total: 0,
    percentage: 0,
  };
  let salaries: SalaryHistoryRow[] = [];
  let showSalaries = false;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: attData } = await supabase
        .from("staff_attendance")
        .select("date, status")
        .eq("madrasa_id", mine.madrasaId)
        .eq("staff_id", member.id);
      att = buildTeacherAttendanceHistory(
        (attData ?? []) as { date: string; status: AttendanceStatus }[],
      );
    }
    showSalaries = await isMadrasaOwner(supabase);
    if (showSalaries && mine) {
      const { data: salData } = await supabase
        .from("salary_payments")
        .select("salary_month, payment_date, amount, payment_method, status")
        .eq("madrasa_id", mine.madrasaId)
        .eq("person_type", "staff")
        .eq("person_id", member.id)
        .order("salary_month", { ascending: false });
      salaries = (salData ?? []) as SalaryHistoryRow[];
    }
  } catch {
    att = {
      months: [],
      present: 0,
      absent: 0,
      leave: 0,
      sick: 0,
      total: 0,
      percentage: 0,
    };
    salaries = [];
    showSalaries = false;
  }

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

        <StaffHistory
          lang={lang}
          att={att}
          salaries={salaries}
          showSalaries={showSalaries}
        />

      </div>
    </div>
  );
}
