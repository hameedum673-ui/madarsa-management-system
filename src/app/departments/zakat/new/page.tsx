/**
 * مرحلہ 19 — نیا زکوٰۃ اندراج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 013 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import ZakatForm from "@/app/departments/zakat/ZakatForm";
import { addZakatRecord } from "@/app/departments/zakat/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewZakatPage() {
  const supabase = await createClient();
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
          <h2>نیا زکوٰۃ اندراج</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            زکوٰۃ کی میز ابھی نہیں بنی — پہلے مرحلہ 19 کی SQL چلائیں۔
          </p>
        ) : (
          <ZakatForm action={addZakatRecord} />
        )}
      </div>
    </div>
  );
}
