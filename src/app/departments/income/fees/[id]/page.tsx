/**
 * مرحلہ 8 — رسید دیکھنے کا صفحہ (سرور صفحہ)
 * رسید پر مدرسے کا نام، رسید نمبر، طالبہ، مہینہ، رقم، تاریخ اور طریقہ ہوتا ہے۔
 * رسید پرچی جیسی چھوٹی ہے (تنگ اور لمبی)؛ "تصویر محفوظ کریں" سے رسید PNG
 * تصویر کے طور پر محفوظ ہوتی ہے — کوئی PDF نہیں بنتا۔ غلط رسید منسوخ کرنے
 * کا بٹن ویسے ہی موجود ہے۔
 * میز ابھی نہ بنی ہو (migration 006 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyMadrasa,
  type SectionId,
} from "@/lib/students";
import {
  formatMonthUrdu,
  type FeePayment,
} from "@/lib/fees";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import VoidButton from "@/app/departments/income/fees/[id]/VoidButton";
import SaveReceiptImageButton from "@/app/departments/income/fees/[id]/SaveReceiptImageButton";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const lang = await getMyLanguage();

  const { data, error } = await supabase
    .from("fee_payments")
    .select("*, students(name, father_name, registration_number, section)")
    .eq("id", id)
    .single();

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  if (tableMissing) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="back-arrow-row">
            <BackButton href="/departments/income/fees" />
          </div>
          <p className="empty-state">
            {t(lang, "fees.table_missing")}
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) notFound();

  const payment = data as FeePayment & {
    students: {
      name: string;
      father_name: string;
      registration_number: string;
      section: string;
    } | null;
  };
  // مرحلہ 54 — بند شعبے کی فیس نہیں کھلے گی
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      (payment.students?.section ?? "banat") as SectionId,
    )
  )
    notFound();

  // مدرسے کا نام رسید پر دکھانے کے لیے
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

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/income/fees" className="no-print" />
          <h2>{t(lang, "fee.receipt_title")}</h2>
          <span className="page-count">{payment.receipt_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <div className="sub">شادی لارج، ضلع بدین، سندھ</div>
        </div>

        <div className="detail-rows">
          <div className="row">
<span>{t(lang, "col.receipt")}</span>
            <span>{payment.receipt_number}</span>
          </div>
          <div className="row">
<span>{t(lang, "col.student")}</span>
            <span>{payment.students?.name ?? "—"}</span>
          </div>
          <div className="row">
<span>{t(lang, "col.father")}</span>
            <span>{payment.students?.father_name ?? "—"}</span>
          </div>
          <div className="row">
<span>{t(lang, "col.reg")}</span>
            <span>{payment.students?.registration_number ?? "—"}</span>
          </div>
          <div className="row">
<span>{t(lang, "fees.month")}</span>
            <span>{formatMonthUrdu(payment.fee_month)}</span>
          </div>
          <div className="row">
<span>{t(lang, "fee.amount_label")}</span>
            <span>
              {t(lang, "common.money", {
                n: payment.amount.toLocaleString("ur-PK"),
              })}
            </span>
          </div>
          <div className="row">
<span>{t(lang, "fee.date_label")}</span>
            <span>{formatDate(payment.payment_date)}</span>
          </div>
          <div className="row">
<span>{t(lang, "fee.method_label")}</span>
            <span>{t(lang, `fee.method.${payment.payment_method}`)}</span>
          </div>
          {payment.note ? (
            <div className="row">
  <span>{t(lang, "fee.form.note")}</span>
              <span>{payment.note}</span>
            </div>
          ) : null}
          <div className="row">
<span>{t(lang, "col.status")}</span>
            <span>{t(lang, `fee.status.${payment.status}`)}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveReceiptImageButton
            data={{
              madrasaName,
              receiptNumber: payment.receipt_number,
              studentName: payment.students?.name ?? "—",
              fatherName: payment.students?.father_name ?? "—",
              registrationNumber: payment.students?.registration_number ?? "—",
              monthLabel: formatMonthUrdu(payment.fee_month),
              amountLabel: `${payment.amount.toLocaleString("ur-PK")} ${t(lang, "audit.detail.currency")}`,
              paymentDate: formatDate(payment.payment_date),
              paymentMethodLabel: t(lang, `fee.method.${payment.payment_method}`),
              note: payment.note,
              statusLabel: t(lang, `fee.status.${payment.status}`),
            }}
            lang={lang}
          />
          {payment.status === "active" ? (
            <VoidButton id={payment.id} lang={lang} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
