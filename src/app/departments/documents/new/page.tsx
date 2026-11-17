/**
 * مرحلہ 28 — نئی دستاویز درج کرنے کا صفحہ (سرور)
 * میز ابھی نہ بنی ہو (migration 021 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import DocumentForm from "@/app/departments/documents/DocumentForm";
import { addDocument } from "@/app/departments/documents/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { error } = await supabase
    .from("documents")
    .select("id")
    .limit(1);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/documents" />
          <h2>{t(lang, "docs.new")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">{t(lang, "docs.table_missing")}</p>
        ) : (
          <DocumentForm action={addDocument} lang={lang} />
        )}
      </div>
    </div>
  );
}
