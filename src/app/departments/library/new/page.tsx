/**
 * مرحلہ 100 — نئی کتاب لکھنے کا صفحہ (سرور)
 * میز ابھی نہ بنی ہو (migration 052 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import BookForm from "@/app/departments/library/BookForm";
import { addBook } from "@/app/departments/library/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewBookPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { error } = await supabase
    .from("library_books")
    .select("id")
    .limit(1);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/library" />
          <h2>{t(lang, "library.add")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">{t(lang, "library.table_missing")}</p>
        ) : (
          <BookForm action={addBook} lang={lang} />
        )}
      </div>
    </div>
  );
}
