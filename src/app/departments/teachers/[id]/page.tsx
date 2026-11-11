/**
 * مرحلہ 5 — استاد کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا استاد کھل سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEPARTMENT_LABELS,
  SECTION_LABELS,
  STUDENT_STATUS_LABELS,
} from "@/lib/students";
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
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const teacher = data as Teacher;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/teachers" />
          <h2>{teacher.name}</h2>
          <span
            className={`badge${teacher.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {STUDENT_STATUS_LABELS[teacher.status]}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>والد کا نام</span>
            <span>{teacher.father_name}</span>
          </div>
          <div className="row">
            <span>شعبہ</span>
            <span>{DEPARTMENT_LABELS[teacher.department]}</span>
          </div>
          <div className="row">
            <span>شعبہ (بنین / بنات)</span>
            <span>{SECTION_LABELS[teacher.section]}</span>
          </div>
          <div className="row">
            <span>عہدہ</span>
            <span>{teacher.position ?? "—"}</span>
          </div>
          <div className="row">
            <span>تقرری کی تاریخ</span>
            <span>{formatDate(teacher.joining_date)}</span>
          </div>
          <div className="row">
            <span>فون</span>
            <span dir="ltr">{teacher.phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>شناختی کارڈ نمبر</span>
            <span dir="ltr">{teacher.cnic ?? "—"}</span>
          </div>
          <div className="row">
            <span>تعلیمی قابلیت</span>
            <span>{teacher.qualification ?? "—"}</span>
          </div>
          <div className="row">
            <span>پتہ</span>
            <span>{teacher.address ?? "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">ریکارڈ تبدیل کریں</h3>
        <TeacherForm
          initial={teacher}
          action={updateTeacher.bind(null, teacher.id)}
          submitLabel="تبدیلی محفوظ کریں"
          cancelHref="/departments/teachers"
          showStatus
        />

      </div>
    </div>
  );
}
