/**
 * مرحلہ 21 — فلاحی اندراج کی تفصیل (سرور صفحہ)
 * غلط اندراج منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 015 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { getMyMadrasa } from "@/lib/students";
import { type WelfareRecord } from "@/lib/welfare";
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
  const lang = await getMyLanguage();

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
            <h2>{t(lang, "welfare.detail_title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "welfare.table_missing")}</p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const record = data as WelfareRecord;
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
    [t(lang, "col.student"), record.students?.name ?? "—"],
    [t(lang, "col.father"), record.students?.father_name ?? "—"],
    [t(lang, "col.reg"), record.students?.registration_number ?? "—"],
    [t(lang, "col.type"), t(lang, `welfare.kind.${record.kind}`)],
    [
      t(lang, "fee.amount_label"),
      `${record.amount.toLocaleString("ur-PK")} ${t(lang, "audit.detail.currency")}`,
    ],
    [t(lang, "col.date"), formatDate(record.record_date)],
  ];
  if (record.note) imageRows.push([t(lang, "fee.form.note"), record.note]);
  imageRows.push([
    t(lang, "col.status"),
    t(lang, `fee.status.${record.status}`),
  ]);
  const imageData: SlipImageData = {
    madrasaName,
    title: t(lang, "welfare.detail_title"),
    numberLabel: t(lang, "welfare.col_record"),
    numberValue: record.record_number,
    rows: imageRows,
    filename: `record-${record.record_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/welfare" />
          <h2>{t(lang, "welfare.detail_title")}</h2>
          <span className="page-count">{record.record_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "welfare.col_record")}</span>
            <span>{record.record_number}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.student")}</span>
            <span>{record.students?.name ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.father")}</span>
            <span>{record.students?.father_name ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.reg")}</span>
            <span>{record.students?.registration_number ?? "—"}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.type")}</span>
            <span>{t(lang, `welfare.kind.${record.kind}`)}</span>
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
          {record.status === "active" ? <VoidButton id={record.id} lang={lang} /> : null}
        </div>
      </div>
    </div>
  );
}
