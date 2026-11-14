/**
 * مرحلہ 14 — نئی جماعت شامل کرنے کا صفحہ
 * ترتیب نمبر پہلے سے اگلا نمبر لگا ہوتا ہے (حفظ شعبے کی جماعتوں کی گنتی + 1) —
 * بدلا بھی جا سکتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import ClassForm from "@/app/departments/classes/ClassForm";
import { addClass } from "@/app/departments/classes/actions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewClassPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { count } = await supabase
    .from("classes")
    .select("id", { count: "exact", head: true })
    .eq("department", "hifz");
  const nextSortOrder = (count ?? 0) + 1;
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/classes" />
          <h2>{t(lang, "classes.new_title")}</h2>
        </div>
        <ClassForm
          initial={{ sort_order: nextSortOrder }}
          action={addClass}
          submitLabel={t(lang, "common.save")}
          cancelHref="/departments/classes"
          lang={lang}
        />
      </div>
    </div>
  );
}
