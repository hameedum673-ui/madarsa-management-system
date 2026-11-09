/**
 * مرحلہ 8 — رسید دیکھنے کا صفحہ (سرور صفحہ)
 * رسید پر مدرسے کا نام، رسید نمبر، طالبہ، مہینہ، رقم، تاریخ اور طریقہ ہوتا ہے۔
 * پرنٹ بٹن سے صرف رسید چھپتی ہے — اوپر کا مینیو اور بٹن نہیں۔
 * میز ابھی نہ بنی ہو (migration 006 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import {
  FEE_PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  formatMonthUrdu,
  type FeePayment,
} from "@/lib/fees";
import VoidButton from "@/app/departments/income/[id]/VoidButton";
import PrintButton from "@/app/departments/income/[id]/PrintButton";

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

  const { data, error } = await supabase
    .from("fee_payments")
    .select("*, students(name, father_name, registration_number)")
    .eq("id", id)
    .single();

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  if (tableMissing) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="back-arrow-row">
            <BackButton />
          </div>
          <p className="empty-state">
            فیس کی میز ابھی نہیں بنی — پہلے مرحلہ 8 کی SQL چلائیں۔
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
    } | null;
  };

  // مدرسے کا نام رسید پر دکھانے کے لیے
  let madrasaName = "مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات";
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
      <div className="page-card receipt">
        <div className="page-head">
          <BackButton href="/departments/income" className="no-print" />
          <h2>فیس کی رسید</h2>
          <span className="page-count">{payment.receipt_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <div className="sub">شادی لارج، ضلع بدین، سندھ</div>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>رسید نمبر</span>
            <span>{payment.receipt_number}</span>
          </div>
          <div className="row">
            <span>طالبہ</span>
            <span>{payment.students?.name ?? "—"}</span>
          </div>
          <div className="row">
            <span>والد کا نام</span>
            <span>{payment.students?.father_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>رجسٹریشن نمبر</span>
            <span>{payment.students?.registration_number ?? "—"}</span>
          </div>
          <div className="row">
            <span>مہینہ</span>
            <span>{formatMonthUrdu(payment.fee_month)}</span>
          </div>
          <div className="row">
            <span>رقم</span>
            <span>{payment.amount.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>ادائیگی کی تاریخ</span>
            <span>{formatDate(payment.payment_date)}</span>
          </div>
          <div className="row">
            <span>ادائیگی کا طریقہ</span>
            <span>{PAYMENT_METHOD_LABELS[payment.payment_method]}</span>
          </div>
          {payment.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{payment.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>حالت</span>
            <span>{FEE_PAYMENT_STATUS_LABELS[payment.status]}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <PrintButton />
          {payment.status === "active" ? <VoidButton id={payment.id} /> : null}
        </div>
      </div>
    </div>
  );
}
