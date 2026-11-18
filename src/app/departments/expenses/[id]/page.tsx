/**
 * مرحلہ 16 — خرچ کا واؤچر دیکھنے کا صفحہ (سرور صفحہ)
 * واؤچر پر مدرسے کا نام، واؤچر نمبر، تفصیل، زمرہ، رقم، تاریخ اور طریقہ ہوتا ہے۔
 * غلط خرچ منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 012 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyMadrasa, type SectionId } from "@/lib/students";
import { type Expense } from "@/lib/expenses";
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
  const lang = await getMyLanguage();

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
            <h2>{t(lang, "expense.voucher_title")}</h2>
          </div>
          <p className="empty-state">
            {t(lang, "expenses.table_missing")}
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
  let madrasaName = t(lang, "app.name");
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
    [t(lang, "exp.col_title"), expense.title],
    [t(lang, "exp.col_category"), t(lang, `exp.cat.${expense.category}`)],
    [
      t(lang, "students.section_filter"),
      t(lang, `section.${expense.section ?? "banat"}`),
    ],
    [
      t(lang, "exp.col_amount"),
      `${expense.amount.toLocaleString("ur-PK")} ${t(lang, "audit.detail.currency")}`,
    ],
    [t(lang, "col.date"), formatDate(expense.expense_date)],
    [
      t(lang, "fee.method_label"),
      t(lang, `fee.method.${expense.payment_method}`),
    ],
  ];
  if (expense.note) imageRows.push([t(lang, "fee.form.note"), expense.note]);
  imageRows.push([
    t(lang, "col.status"),
    t(lang, `fee.status.${expense.status}`),
  ]);
  const imageData: SlipImageData = {
    madrasaName,
    title: t(lang, "expense.voucher_title"),
    numberLabel: t(lang, "exp.col_voucher"),
    numberValue: expense.voucher_number,
    rows: imageRows,
    filename: `voucher-${expense.voucher_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/expenses" />
          <h2>{t(lang, "expense.voucher_title")}</h2>
          <span className="page-count">{expense.voucher_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "exp.col_voucher")}</span>
            <span>{expense.voucher_number}</span>
          </div>
          <div className="row">
            <span>{t(lang, "exp.col_title")}</span>
            <span>{expense.title}</span>
          </div>
          <div className="row">
            <span>{t(lang, "exp.col_category")}</span>
            <span>{t(lang, `exp.cat.${expense.category}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>{t(lang, `section.${(expense.section ?? "banat") as SectionId}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "exp.col_amount")}</span>
            <span>{t(lang, "common.money", { n: expense.amount.toLocaleString("ur-PK") })}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.date")}</span>
            <span>{formatDate(expense.expense_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "fee.method_label")}</span>
            <span>{t(lang, `fee.method.${expense.payment_method}`)}</span>
          </div>
          {expense.note ? (
            <div className="row">
              <span>{t(lang, "fee.form.note")}</span>
              <span>{expense.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <span>{t(lang, `fee.status.${expense.status}`)}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} lang={lang} />
          {expense.status === "active" ? <VoidButton id={expense.id} lang={lang} /> : null}
        </div>
      </div>
    </div>
  );
}
