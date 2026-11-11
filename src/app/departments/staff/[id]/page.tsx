/**
 * مرحلہ 13 — عملے کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا عملہ کھل سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEPARTMENT_LABELS,
  SECTION_LABELS,
  STUDENT_STATUS_LABELS,
} from "@/lib/students";
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
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const member = data as StaffMember;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/staff" />
          <h2>{member.name}</h2>
          <span
            className={`badge${member.status === "withdrawn" ? " badge-withdrawn" : ""}`}
          >
            {STUDENT_STATUS_LABELS[member.status]}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>والد کا نام</span>
            <span>{member.father_name}</span>
          </div>
          <div className="row">
            <span>شعبہ</span>
            <span>{DEPARTMENT_LABELS[member.department]}</span>
          </div>
          <div className="row">
            <span>شعبہ (بنین / بنات)</span>
            <span>{SECTION_LABELS[member.section]}</span>
          </div>
          <div className="row">
            <span>عہدہ / کام</span>
            <span>{member.position ?? "—"}</span>
          </div>
          <div className="row">
            <span>تقرری کی تاریخ</span>
            <span>{formatDate(member.joining_date)}</span>
          </div>
          <div className="row">
            <span>فون</span>
            <span dir="ltr">{member.phone ?? "—"}</span>
          </div>
          <div className="row">
            <span>شناختی کارڈ نمبر</span>
            <span dir="ltr">{member.cnic ?? "—"}</span>
          </div>
          <div className="row">
            <span>تعلیمی قابلیت</span>
            <span>{member.qualification ?? "—"}</span>
          </div>
          <div className="row">
            <span>پتہ</span>
            <span>{member.address ?? "—"}</span>
          </div>
        </div>

        <h3 className="form-section-title">ریکارڈ تبدیل کریں</h3>
        <StaffForm
          initial={member}
          action={updateStaff.bind(null, member.id)}
          submitLabel="تبدیلی محفوظ کریں"
          cancelHref="/departments/staff"
          showStatus
        />

      </div>
    </div>
  );
}
