/**
 * مرحلہ 8 — رسید دیکھنے کا صفحہ (سرور صفحہ)
 * رسید پر مدرسے کا نام، رسید نمبر، طالبہ، مہینہ، رقم، تاریخ اور طریقہ ہوتا ہے۔
 * پرنٹ بٹن سے صرف رسید چھپتی ہے — اوپر کا مینیو اور بٹن نہیں۔
 * میز ابھی نہ بنی ہو (migration 006 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
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
          <p className="empty-state">
            فیس کی میز ابھی نہیں بنی — پہلے مرحلہ 8 کی SQL چلائیں۔
          </p>
          <Link className="back-btn" href="/">
            واپس مین ڈیش بورڈ
          </Link>
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
          <h2>فیس کی رسید</h2>
          <span className="page-count">{payment.receipt_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <div className="sub">شادی لارج، ضلع بدین، سندھ</div>
        </div>

        <div className="detail-rows">
          <div>
            <span>رسید نمبر</span>
            <strong>{payment.receipt_number}</strong>
          </div>
          <div>
            <span>طالبہ</span>
            <strong>{payment.students?.name ?? "—"}</strong>
          </div>
          <div>
            <span>والد کا نام</span>
            <strong>{payment.students?.father_name ?? "—"}</strong>
          </div>
          <div>
            <span>رجسٹریشن نمبر</span>
            <strong>{payment.students?.registration_number ?? "—"}</strong>
          </div>
          <div>
            <span>مہینہ</span>
            <strong>{formatMonthUrdu(payment.fee_month)}</strong>
          </div>
          <div>
            <span>رقم</span>
            <strong>{payment.amount.toLocaleString("ur-PK")} روپے</strong>
          </div>
          <div>
            <span>ادائیگی کی تاریخ</span>
            <strong>{formatDate(payment.payment_date)}</strong>
          </div>
          <div>
            <span>ادائیگی کا طریقہ</span>
            <strong>{PAYMENT_METHOD_LABELS[payment.payment_method]}</strong>
          </div>
          {payment.note ? (
            <div>
              <span>نوٹ</span>
              <strong>{payment.note}</strong>
            </div>
          ) : null}
          <div>
            <span>حالت</span>
            <strong>{FEE_PAYMENT_STATUS_LABELS[payment.status]}</strong>
          </div>
        </div>

        <div className="form-actions no-print">
          <PrintButton />
          {payment.status === "active" ? <VoidButton id={payment.id} /> : null}
        </div>

        <Link className="back-btn no-print" href="/departments/income">
          واپس آمدنی کا ریکارڈ
        </Link>
      </div>
    </div>
  );
}
