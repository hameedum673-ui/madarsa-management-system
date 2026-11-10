/**
 * مرحلہ 22 — خرچ کے اندراج کی تفصیل (سرور صفحہ)
 * غلط اندراج منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 016 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import {
  STUDENT_EXPENSE_CATEGORY_LABELS,
  STUDENT_EXPENSE_STATUS_LABELS,
  type StudentExpense,
} from "@/lib/studentExpenses";
import VoidButton from "@/app/departments/student-exp/[id]/VoidButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function StudentExpDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("student_expenses")
    .select("*, students(name, father_name, registration_number)")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/student-exp" />
            <h2>خرچ کا اندراج</h2>
          </div>
          <p className="empty-state">
            طلبہ کے اخراجات کی میز ابھی نہیں بنی — پہلے مرحلہ 22 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const record = data as StudentExpense;
  const mine = await getMyMadrasa(supabase);
  let madrasaName = "مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات";
  if (mine) {
    const { data: madrasa } = await supabase
      .from("madrasas")
      .select("name")
      .eq("id", mine.madrasaId)
      .single();
    if (madrasa?.name) madrasaName = madrasa.name as string;
  }

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/student-exp" />
          <h2>خرچ کا اندراج</h2>
          <span className="page-count">{record.record_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>ریکارڈ نمبر</span>
            <span>{record.record_number}</span>
          </div>
          <div className="row">
            <span>طالبہ</span>
            <span>{record.students?.name ?? "—"}</span>
          </div>
          <div className="row">
            <span>والد کا نام</span>
            <span>{record.students?.father_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>رجسٹریشن نمبر</span>
            <span>{record.students?.registration_number ?? "—"}</span>
          </div>
          <div className="row">
            <span>قسم</span>
            <span>{STUDENT_EXPENSE_CATEGORY_LABELS[record.category]}</span>
          </div>
          <div className="row">
            <span>رقم</span>
            <span>{record.amount.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>تاریخ</span>
            <span>{formatDate(record.expense_date)}</span>
          </div>
          {record.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{record.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>حالت</span>
            <span>{STUDENT_EXPENSE_STATUS_LABELS[record.status]}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          {record.status === "active" ? <VoidButton id={record.id} /> : null}
        </div>
      </div>
    </div>
  );
}
