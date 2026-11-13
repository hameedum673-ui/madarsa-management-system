/**
 * مرحلہ 16 — خرچ کا واؤچر دیکھنے کا صفحہ (سرور صفحہ)
 * واؤچر پر مدرسے کا نام، واؤچر نمبر، تفصیل، زمرہ، رقم، تاریخ اور طریقہ ہوتا ہے۔
 * غلط خرچ منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 012 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { SECTION_LABELS, type SectionId } from "@/lib/students";
import { getMyMadrasa } from "@/lib/students";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_STATUS_LABELS,
  type Expense,
} from "@/lib/expenses";
import VoidButton from "@/app/departments/expenses/[id]/VoidButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/expenses" />
            <h2>خرچ کا واؤچر</h2>
          </div>
          <p className="empty-state">
            اخراجات کی میز ابھی نہیں بنی — پہلے مرحلہ 16 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const expense = data as Expense;
  // مرحلہ 62 — شعبہ بند ہو تو تفصیل نہیں کھلتی
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has((expense.section ?? "banat") as SectionId)) {
    notFound();
  }
  const mine = await getMyMadrasa(supabase);
  let madrasaName = "جامعہ منیجمنٹ سسٹم";
  if (mine) {
    const { data: madrasa } = await supabase
      .from("madrasas")
      .select("name")
      .eq("id", mine.madrasaId)
      .single();
    if (madrasa?.name) madrasaName = madrasa.name as string;
  }

  // مرحلہ 40 — تصویر کے لیے وہی قطاریں جو صفحے پر ہیں
  const imageRows: [string, string][] = [
    ["تفصیل", expense.title],
    ["زمرہ", EXPENSE_CATEGORY_LABELS[expense.category]],
    ["شعبہ (بنین / بنات)", SECTION_LABELS[(expense.section ?? "banat") as SectionId]],
    ["رقم", `${expense.amount.toLocaleString("ur-PK")} روپے`],
    ["تاریخ", formatDate(expense.expense_date)],
    ["ادائیگی کا طریقہ", PAYMENT_METHOD_LABELS[expense.payment_method]],
  ];
  if (expense.note) imageRows.push(["نوٹ", expense.note]);
  imageRows.push(["حالت", EXPENSE_STATUS_LABELS[expense.status]]);
  const imageData: SlipImageData = {
    madrasaName,
    title: "خرچ کا واؤچر",
    numberLabel: "واؤچر نمبر",
    numberValue: expense.voucher_number,
    rows: imageRows,
    filename: `voucher-${expense.voucher_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/expenses" />
          <h2>خرچ کا واؤچر</h2>
          <span className="page-count">{expense.voucher_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>واؤچر نمبر</span>
            <span>{expense.voucher_number}</span>
          </div>
          <div className="row">
            <span>تفصیل</span>
            <span>{expense.title}</span>
          </div>
          <div className="row">
            <span>زمرہ</span>
            <span>{EXPENSE_CATEGORY_LABELS[expense.category]}</span>
          </div>
          <div className="row">
            <span>شعبہ (بنین / بنات)</span>
            <span>{SECTION_LABELS[(expense.section ?? "banat") as SectionId]}</span>
          </div>
          <div className="row">
            <span>رقم</span>
            <span>{expense.amount.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>تاریخ</span>
            <span>{formatDate(expense.expense_date)}</span>
          </div>
          <div className="row">
            <span>ادائیگی کا طریقہ</span>
            <span>{PAYMENT_METHOD_LABELS[expense.payment_method]}</span>
          </div>
          {expense.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{expense.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>حالت</span>
            <span>{EXPENSE_STATUS_LABELS[expense.status]}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} />
          {expense.status === "active" ? <VoidButton id={expense.id} /> : null}
        </div>
      </div>
    </div>
  );
}
