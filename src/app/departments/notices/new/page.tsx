/**
 * مرحلہ 27 — نئی اطلاع لکھنے کا صفحہ (سرور)
 * میز ابھی نہ بنی ہو (migration 020 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import NoticeForm from "@/app/departments/notices/NoticeForm";
import { addNotice } from "@/app/departments/notices/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewNoticePage() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("notices")
    .select("id")
    .limit(1);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/notices" />
          <h2>نئی اطلاع لکھیں</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            اطلاعات کی میز ابھی نہیں بنی — پہلے مرحلہ 27 کی SQL چلائیں۔
          </p>
        ) : (
          <NoticeForm action={addNotice} />
        )}
      </div>
    </div>
  );
}
