/**
 * مرحلہ 5 — نیا استاد شامل کرنے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import TeacherForm from "@/app/departments/teachers/TeacherForm";
import { addTeacher } from "@/app/departments/teachers/actions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewTeacherPage() {
  const lang = await getMyLanguage();
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/teachers" />
          <h2>{t(lang, "teachers.new_title")}</h2>
        </div>
        <TeacherForm
          action={addTeacher}
          submitLabel={t(lang, "common.save")}
          cancelHref="/departments/teachers"
          lang={lang}
        />
      </div>
    </div>
  );
}
