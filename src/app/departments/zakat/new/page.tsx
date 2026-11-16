/**
 * مرحلہ 19 — نیا زکوٰۃ اندراج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 013 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import ZakatForm from "@/app/departments/zakat/ZakatForm";
import { addZakatRecord } from "@/app/departments/zakat/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewZakatPage() {
  const supabase = await createClient();
  const lang = await getMyLanguage();
  const { error } = await supabase
    .from("zakat_records")
    .select("id", { head: true })
    .limit(1);

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/zakat" />
          <h2>{t(lang, "zakat.new_title")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">{t(lang, "zakat.table_missing")}</p>
        ) : (
          <ZakatForm action={addZakatRecord} lang={lang} />
        )}
      </div>
    </div>
  );
}
