/**
 * مرحلہ 48 — عشر اندراج کی تفصیل (سرور صفحہ)
 * غلط اندراج منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 027 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { SECTION_LABELS, type SectionId } from "@/lib/students";
import { getMyMadrasa } from "@/lib/students";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  USHR_STATUS_LABELS,
  type UshrRecord,
} from "@/lib/ushr";
import VoidButton from "@/app/departments/ushr/[id]/VoidButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function UshrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ushr_records")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/ushr" />
            <h2>عشر اندراج</h2>
          </div>
          <p className="empty-state">
            عشر کی میز ابھی نہیں بنی — پہلے مرحلہ 48 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const record = data as UshrRecord;
  // مرحلہ 62 — شعبہ بند ہو تو تفصیل نہیں کھلتی
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has((record.section ?? "banat") as SectionId)) {
    notFound();
  }
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

  // مرحلہ 40 — تصویر کے لیے وہی قطاریں جو صفحے پر ہیں
  const imageRows: [string, string][] = [
    ["نام", record.person_name],
    ["شعبہ (بنین / بنات)", SECTION_LABELS[(record.section ?? "banat") as SectionId]],
    ["رقم", `${record.amount.toLocaleString("ur-PK")} روپے`],
    ["تاریخ", formatDate(record.record_date)],
    ["ادائیگی کا طریقہ", PAYMENT_METHOD_LABELS[record.payment_method]],
  ];
  if (record.note) imageRows.push(["نوٹ", record.note]);
  imageRows.push(["حالت", USHR_STATUS_LABELS[record.status]]);
  const imageData: SlipImageData = {
    madrasaName,
    title: "عشر کا اندراج",
    numberLabel: "رسید نمبر",
    numberValue: record.receipt_number,
    rows: imageRows,
    filename: `receipt-${record.receipt_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/ushr" />
          <h2>عشر اندراج</h2>
          <span className="page-count">{record.receipt_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>رسید نمبر</span>
            <span>{record.receipt_number}</span>
          </div>
          <div className="row">
            <span>نام</span>
            <span>{record.person_name}</span>
          </div>
          <div className="row">
            <span>شعبہ (بنین / بنات)</span>
            <span>{SECTION_LABELS[(record.section ?? "banat") as SectionId]}</span>
          </div>
          <div className="row">
            <span>رقم</span>
            <span>{record.amount.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>تاریخ</span>
            <span>{formatDate(record.record_date)}</span>
          </div>
          <div className="row">
            <span>ادائیگی کا طریقہ</span>
            <span>{PAYMENT_METHOD_LABELS[record.payment_method]}</span>
          </div>
          {record.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{record.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>حالت</span>
            <span>{USHR_STATUS_LABELS[record.status]}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} />
          {record.status === "active" ? <VoidButton id={record.id} /> : null}
        </div>
      </div>
    </div>
  );
}
