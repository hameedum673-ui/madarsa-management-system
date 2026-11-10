/**
 * مرحلہ 14 — جماعت کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی جماعت کھل سکتی ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DEPARTMENT_LABELS } from "@/lib/students";
import { CLASS_STATUS_LABELS, type MadrasaClass } from "@/lib/classes";
import ClassForm from "@/app/departments/classes/ClassForm";
import { updateClass } from "@/app/departments/classes/actions";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const madrasaClass = data as MadrasaClass;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/classes" />
          <h2>{madrasaClass.name}</h2>
          <span
            className={`badge${madrasaClass.status === "inactive" ? " badge-withdrawn" : ""}`}
          >
            {CLASS_STATUS_LABELS[madrasaClass.status]}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>شعبہ</span>
            <span>{DEPARTMENT_LABELS[madrasaClass.department]}</span>
          </div>
          <div className="row">
            <span>ترتیب نمبر</span>
            <span>{madrasaClass.sort_order.toLocaleString("ur-PK")}</span>
          </div>
          <div className="row">
            <span>حالت</span>
            <span>{CLASS_STATUS_LABELS[madrasaClass.status]}</span>
          </div>
        </div>

        <h3 className="form-section-title">ریکارڈ تبدیل کریں</h3>
        <ClassForm
          initial={madrasaClass}
          action={updateClass.bind(null, madrasaClass.id)}
          submitLabel="تبدیلی محفوظ کریں"
          cancelHref="/departments/classes"
          showStatus
        />

      </div>
    </div>
  );
}
