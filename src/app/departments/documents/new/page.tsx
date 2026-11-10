/**
 * مرحلہ 28 — نئی دستاویز درج کرنے کا صفحہ (سرور)
 * میز ابھی نہ بنی ہو (migration 021 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import DocumentForm from "@/app/departments/documents/DocumentForm";
import { addDocument } from "@/app/departments/documents/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("documents")
    .select("id")
    .limit(1);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/documents" />
          <h2>نئی دستاویز درج کریں</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            دستاویزات کی میز ابھی نہیں بنی — پہلے مرحلہ 28 کی SQL چلائیں۔
          </p>
        ) : (
          <DocumentForm action={addDocument} />
        )}
      </div>
    </div>
  );
}
