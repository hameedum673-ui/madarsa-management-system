/**
 * مرحلہ 48 — نیا عشر اندراج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 027 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import UshrForm from "@/app/departments/ushr/UshrForm";
import { addUshrRecord } from "@/app/departments/ushr/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewUshrPage() {
  const supabase = await createClient();
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
          <h2>نیا عشر اندراج</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            عشر کی میز ابھی نہیں بنی — پہلے مرحلہ 48 کی SQL چلائیں۔
          </p>
        ) : (
          <UshrForm action={addUshrRecord} />
        )}
      </div>
    </div>
  );
}
