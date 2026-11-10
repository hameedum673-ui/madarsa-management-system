/**
 * مرحلہ 20 — نیا عطیہ درج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 014 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import DonationForm from "@/app/departments/donations/DonationForm";
import { addDonation } from "@/app/departments/donations/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewDonationPage() {
  const supabase = await createClient();
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
          <h2>نیا عطیہ درج کریں</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            عطیات کی میز ابھی نہیں بنی — پہلے مرحلہ 20 کی SQL چلائیں۔
          </p>
        ) : (
          <DonationForm action={addDonation} />
        )}
      </div>
    </div>
  );
}
