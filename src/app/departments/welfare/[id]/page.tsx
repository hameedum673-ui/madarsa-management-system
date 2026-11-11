/**
 * مرحلہ 21 — فلاحی اندراج کی تفصیل (سرور صفحہ)
 * غلط اندراج منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 015 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import {
  WELFARE_KIND_LABELS,
  WELFARE_STATUS_LABELS,
  type WelfareRecord,
} from "@/lib/welfare";
import VoidButton from "@/app/departments/welfare/[id]/VoidButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function WelfareDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("welfare_records")
    .select("*, students(name, father_name, registration_number)")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/welfare" />
            <h2>فلاحی اندراج</h2>
          </div>
          <p className="empty-state">
            فلاحی کام کی میز ابھی نہیں بنی — پہلے مرحلہ 21 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const record = data as WelfareRecord;
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
    ["طالبہ", record.students?.name ?? "—"],
    ["والد کا نام", record.students?.father_name ?? "—"],
    ["رجسٹریشن نمبر", record.students?.registration_number ?? "—"],
    ["قسم", WELFARE_KIND_LABELS[record.kind]],
    ["رقم", `${record.amount.toLocaleString("ur-PK")} روپے`],
    ["تاریخ", formatDate(record.record_date)],
  ];
  if (record.note) imageRows.push(["نوٹ", record.note]);
  imageRows.push(["حالت", WELFARE_STATUS_LABELS[record.status]]);
  const imageData: SlipImageData = {
    madrasaName,
    title: "فلاحی اندراج",
    numberLabel: "ریکارڈ نمبر",
    numberValue: record.record_number,
    rows: imageRows,
    filename: `record-${record.record_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/welfare" />
          <h2>فلاحی اندراج</h2>
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
            <span>{WELFARE_KIND_LABELS[record.kind]}</span>
          </div>
          <div className="row">
            <span>رقم</span>
            <span>{record.amount.toLocaleString("ur-PK")} روپے</span>
          </div>
          <div className="row">
            <span>تاریخ</span>
            <span>{formatDate(record.record_date)}</span>
          </div>
          {record.note ? (
            <div className="row">
              <span>نوٹ</span>
              <span>{record.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>حالت</span>
            <span>{WELFARE_STATUS_LABELS[record.status]}</span>
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
