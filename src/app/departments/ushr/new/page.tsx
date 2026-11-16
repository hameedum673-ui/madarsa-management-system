/**
 * مرحلہ 48 — نیا عشر اندراج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 027 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import UshrForm from "@/app/departments/ushr/UshrForm";
import { addUshrRecord } from "@/app/departments/ushr/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewUshrPage() {
  const supabase = await createClient();
  const lang = await getMyLanguage();
  const { error } = await supabase
    .from("ushr_records")
    .select("id", { head: true })
    .limit(1);

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/ushr" />
          <h2>{t(lang, "ushr.new_title")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">{t(lang, "ushr.table_missing")}</p>
        ) : (
          <UshrForm action={addUshrRecord} lang={lang} />
        )}
      </div>
    </div>
  );
}
