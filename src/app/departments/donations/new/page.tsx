/**
 * مرحلہ 20 — نیا عطیہ درج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 014 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import DonationForm from "@/app/departments/donations/DonationForm";
import { addDonation } from "@/app/departments/donations/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewDonationPage() {
  const supabase = await createClient();
  const lang = await getMyLanguage();
  const { error } = await supabase
    .from("donations")
    .select("id", { head: true })
    .limit(1);

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/donations" />
          <h2>{t(lang, "donations.new_title")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">{t(lang, "donations.table_missing")}</p>
        ) : (
          <DonationForm action={addDonation} lang={lang} />
        )}
      </div>
    </div>
  );
}
