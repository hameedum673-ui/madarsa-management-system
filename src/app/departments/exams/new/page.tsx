/**
 * مرحلہ 10 — نیا امتحان بنانے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import ExamForm from "@/app/departments/exams/ExamForm";
import { addExam } from "@/app/departments/exams/actions";
import { getActiveClasses } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewExamPage() {
  const supabase = await createClient();
  const [classes, lang] = await Promise.all([
    getActiveClasses(supabase),
    getMyLanguage(),
  ]);
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/exams" />
          <h2>{t(lang, "exams.new_title")}</h2>
        </div>

        <ExamForm action={addExam} classes={classes} lang={lang} />
      </div>
    </div>
  );
}
