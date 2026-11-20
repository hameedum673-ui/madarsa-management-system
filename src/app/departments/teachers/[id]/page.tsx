/**
 * مرحلہ 5 — استاد کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا استاد کھل سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import {
  buildTeacherAttendanceHistory,
  type AttendanceStatus,
  type TeacherAttendanceHistory,
} from "@/lib/attendance";
import TeacherHistory, {
  type SalaryHistoryRow,
} from "@/app/departments/teachers/[id]/TeacherHistory";
import TeacherClasses, {
  type TeacherClassOption,
  type TeacherClassRow,
} from "@/app/departments/teachers/[id]/TeacherClasses";
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

  // استاد کی تاریخ — نہ ملے تو خالی (صفحہ نہیں ٹوٹے گا)
  // تنخواہوں کی تاریخ صرف مالک کے لیے (تنخواہوں والا صفحہ بھی صرف مالک کا ہے)
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
  // پڑھائی گئی جماعتیں — نہ ملیں تو خالی (صفحہ نہیں ٹوٹے گا)
  let assignments: TeacherClassRow[] = [];
  let classOptions: TeacherClassOption[] = [];
  let canAssign = false;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: attData } = await supabase
        .from("teacher_attendance")
        .select("date, status")
        .eq("madrasa_id", mine.madrasaId)
        .eq("teacher_id", teacher.id);
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
        .eq("person_type", "teacher")
        .eq("person_id", teacher.id)
        .order("salary_month", { ascending: false });
      salaries = (salData ?? []) as SalaryHistoryRow[];
    }
    if (mine) {
      const { data: tcData } = await supabase
        .from("teacher_classes")
        .select("id, subject, classes(name)")
        .eq("madrasa_id", mine.madrasaId)
        .eq("teacher_id", teacher.id)
        .order("created_at", { ascending: true });
      assignments = (
        (tcData ?? []) as {
          id: string;
          subject: string;
          classes: { name: string }[] | { name: string } | null;
        }[]
      ).map((r) => ({
        id: r.id,
        class_name: Array.isArray(r.classes)
          ? (r.classes[0]?.name ?? "—")
          : (r.classes?.name ?? "—"),
        subject: r.subject ?? "",
      }));
      const { data: clsData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("madrasa_id", mine.madrasaId)
        .eq("department", teacher.department)
        .eq("section", teacher.section)
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      classOptions = (clsData ?? []) as TeacherClassOption[];
    }
    canAssign = (await isAppAdmin(supabase)) || showSalaries;
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
    assignments = [];
    classOptions = [];
    canAssign = false;
  }

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

        <TeacherHistory
          lang={lang}
          att={att}
          salaries={salaries}
          showSalaries={showSalaries}
        />

        <TeacherClasses
          lang={lang}
          teacherId={teacher.id}
          assignments={assignments}
          classes={classOptions}
          canAssign={canAssign}
        />

      </div>
    </div>
  );
}
