/**
 * مرحلہ 4 — طالبہ کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی طالبہ کھل سکتی ہے۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEPARTMENT_LABELS,
  STUDENT_STATUS_LABELS,
  type Student,
} from "@/lib/students";
import StudentForm from "@/app/departments/students/StudentForm";
import { updateStudent } from "@/app/departments/students/actions";

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
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const student = data as Student;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <h2>
            {student.name} — {student.registration_number}
          </h2>
          <span
            className={`badge${student.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {STUDENT_STATUS_LABELS[student.status]}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>رجسٹریشن نمبر</span>
            <span>{student.registration_number}</span>
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
            <span>داخلہ کی تاریخ</span>
            <span>{formatDate(student.admission_date)}</span>
          </div>
          <div className="row">
            <span>تاریخِ پیدائش</span>
            <span>{formatDate(student.date_of_birth)}</span>
          </div>
          <div className="row">
            <span>سرپرست</span>
            <span>{student.guardian_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>سرپرست کا فون</span>
            <span dir="ltr">{student.guardian_phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>پتہ</span>
            <span>{student.address ?? "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">ریکارڈ تبدیل کریں</h3>
        <StudentForm
          initial={student}
          action={updateStudent.bind(null, student.id)}
          submitLabel="تبدیلی محفوظ کریں"
          cancelHref="/departments/students"
          showStatus
        />

        <Link className="back-btn" href="/departments/students">
          واپس طلبہ کی فہرست
        </Link>
      </div>
    </div>
  );
}
