/**
 * مرحلہ 20 — عطیے کی تفصیل (سرور صفحہ)
 * غلط اندراج منسوخ کرنے کا بٹن موجود ہے — ریکارڈ حذف نہیں ہوتا۔
 * میز ابھی نہ بنی ہو (migration 014 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { getMyAllowedSections } from "@/lib/permissions";
import { SECTION_LABELS, type SectionId } from "@/lib/students";
import { getMyMadrasa } from "@/lib/students";
import { PAYMENT_METHOD_LABELS } from "@/lib/fees";
import {
  DONATION_KIND_LABELS,
  DONATION_STATUS_LABELS,
  type Donation,
} from "@/lib/donations";
import VoidButton from "@/app/departments/donations/[id]/VoidButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function DonationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const lang = await getMyLanguage();

  const { data, error } = await supabase
    .from("donations")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/donations" />
            <h2>{t(lang, "donations.detail_title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "donations.table_missing")}</p>
        </div>
      </div>
    );
  }
  if (error || !data) {
    notFound();
  }

  const donation = data as Donation;
  // مرحلہ 62 — شعبہ بند ہو تو تفصیل نہیں کھلتی
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has((donation.section ?? "banat") as SectionId)) {
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
    ["قسم", DONATION_KIND_LABELS[donation.kind]],
    ["عطیہ دینے والا", donation.donor_name],
    ["شعبہ (بنین / بنات)", SECTION_LABELS[(donation.section ?? "banat") as SectionId]],
    ["رقم", `${donation.amount.toLocaleString("ur-PK")} روپے`],
    ["تاریخ", formatDate(donation.donation_date)],
    ["ادائیگی کا طریقہ", PAYMENT_METHOD_LABELS[donation.payment_method]],
  ];
  if (donation.note) imageRows.push(["نوٹ", donation.note]);
  imageRows.push(["حالت", DONATION_STATUS_LABELS[donation.status]]);
  const imageData: SlipImageData = {
    madrasaName,
    title: "عطیہ کی رسید",
    numberLabel: "رسید نمبر",
    numberValue: donation.receipt_number,
    rows: imageRows,
    filename: `receipt-${donation.receipt_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href="/departments/donations" />
          <h2>{t(lang, "donations.detail_title")}</h2>
          <span className="page-count">{donation.receipt_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.receipt")}</span>
            <span>{donation.receipt_number}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.type")}</span>
            <span>{t(lang, `monthly.kind.${donation.kind}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "students.section_filter")}</span>
            <span>
              {t(lang, `section.${(donation.section ?? "banat") as SectionId}`)}
            </span>
          </div>
          <div className="row">
            <span>{t(lang, "col.name")}</span>
            <span>{donation.donor_name}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.amount")}</span>
            <span>
              {t(lang, "common.money", {
                n: donation.amount.toLocaleString("ur-PK"),
              })}
            </span>
          </div>
          <div className="row">
            <span>{t(lang, "col.date")}</span>
            <span>{formatDate(donation.donation_date)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "fee.method_label")}</span>
            <span>{t(lang, `fee.method.${donation.payment_method}`)}</span>
          </div>
          {donation.note ? (
            <div className="row">
              <span>{t(lang, "fee.form.note")}</span>
              <span>{donation.note}</span>
            </div>
          ) : null}
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <span>{t(lang, `fee.status.${donation.status}`)}</span>
          </div>
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} />
          {donation.status === "active" ? <VoidButton id={donation.id} lang={lang} /> : null}
        </div>
      </div>
    </div>
  );
}
