/**
 * مرحلہ 10 — نیا امتحان بنانے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import ExamForm from "@/app/departments/exams/ExamForm";
import { addExam } from "@/app/departments/exams/actions";
import { getActiveClasses, getClassSubjectTemplates } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewExamPage() {
  const supabase = await createClient();
  const [classes, templates, lang] = await Promise.all([
    getActiveClasses(supabase),
    getClassSubjectTemplates(supabase),
    getMyLanguage(),
  ]);
  // جماعت کے مضامین کا سانچہ ہر جماعت کے ساتھ جوڑ دیں — فارم جماعت
  // چنتے ہی مضامین کا خانہ اس سے بھر دے گا۔
  const classesWithSubjects = classes.map((c) => {
    const tpl = templates.find(
      (tp) =>
        tp.name === c.name &&
        tp.department === c.department &&
        tp.section === c.section,
    );
    return tpl ? { ...c, subjects: tpl.subjects } : c;
  });
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/exams" />
          <h2>{t(lang, "exams.new_title")}</h2>
        </div>

        <ExamForm action={addExam} classes={classesWithSubjects} lang={lang} />
      </div>
    </div>
  );
}
