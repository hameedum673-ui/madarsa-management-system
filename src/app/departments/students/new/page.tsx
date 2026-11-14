/**
 * مرحلہ 4 — نئی طالبہ شامل کرنے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import StudentForm from "@/app/departments/students/StudentForm";
import { addStudent } from "@/app/departments/students/actions";
import { getActiveClasses } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const classes = await getActiveClasses(supabase);
  const lang = await langP;
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/students" />
          <h2>{t(lang, "students.new_title")}</h2>
        </div>
        <StudentForm
          action={addStudent}
          submitLabel={t(lang, "common.save")}
          cancelHref="/departments/students"
          classes={classes}
          lang={lang}
        />
      </div>
    </div>
  );
}
