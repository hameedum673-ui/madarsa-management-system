/**
 * مرحلہ 19 — زکوٰۃ اندراج کی تفصیل (سرور صفحہ)
 * غلط اندراج منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 013 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyMadrasa, type SectionId } from "@/lib/students";
import { type ZakatRecord } from "@/lib/zakat";
import VoidButton from "@/app/departments/zakat/[id]/VoidButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ZakatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const lang = await getMyLanguage();

  const { data, error } = await supabase
    .from("zakat_records")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/zakat" />
            <h2>{t(lang, "zakat.detail_title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "zakat.table_missing")}</p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const record = data as ZakatRecord;
  // مرحلہ 62 — شعبہ بند ہو تو تفصیل نہیں کھلتی
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has((record.section ?? "banat") as SectionId)) {
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
    [t(lang, "col.name"), record.person_name],
    [
      t(lang, "students.section_filter"),
      t(lang, `section.${record.section ?? "banat"}`),
    ],
    [
      t(lang, "fee.amount_label"),
      `${record.amount.toLocaleString("ur-PK")} ${t(lang, "audit.detail.currency")}`,
    ],
    [t(lang, "col.date"), formatDate(record.record_date)],
    [
      t(lang, "fee.method_label"),
      t(lang, `fee.method.${record.payment_method}`),
    ],
  ];
  if (record.note) imageRows.push([t(lang, "fee.form.note"), record.note]);
  imageRows.push([
    t(lang, "col.status"),
    t(lang, `fee.status.${record.status}`),
  ]);
  const imageData: SlipImageData = {
    madrasaName,
    title: t(lang, "slip.zakat_title"),
    numberLabel: t(lang, "col.receipt"),
    numberValue: record.receipt_number,
    rows: imageRows,
    filename: `receipt-${record.receipt_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/zakat" />
          <h2>{t(lang, "zakat.detail_title")}</h2>
          <span className="page-count">{record.receipt_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.receipt")}</span>
            <span>{record.receipt_number}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.name")}</span>
            <span>{record.person_name}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>
              {t(lang, `section.${(record.section ?? "banat") as SectionId}`)}
            </span>
          </div>
          <div className="row">
            <span>{t(lang, "col.amount")}</span>
            <span>
              {t(lang, "common.money", {
                n: record.amount.toLocaleString("ur-PK"),
              })}
            </span>
          </div>
          <div className="row">
            <span>{t(lang, "col.date")}</span>
            <span>{formatDate(record.record_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "fee.method_label")}</span>
            <span>{t(lang, `fee.method.${record.payment_method}`)}</span>
          </div>
          {record.note ? (
            <div className="row">
              <span>{t(lang, "fee.form.note")}</span>
              <span>{record.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <span>{t(lang, `fee.status.${record.status}`)}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} lang={lang} />
          {record.status === "active" ? (
            <VoidButton id={record.id} lang={lang} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
