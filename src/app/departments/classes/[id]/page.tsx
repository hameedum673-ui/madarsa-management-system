/**
 * مرحلہ 14 — جماعت کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی جماعت کھل سکتی ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import type { MadrasaClass } from "@/lib/classes";
import ClassForm from "@/app/departments/classes/ClassForm";
import { updateClass } from "@/app/departments/classes/actions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    notFound();
  }

  const madrasaClass = data as MadrasaClass;
  // مرحلہ 54 — بند شعبے کا ریکارڈ نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(madrasaClass.section)) notFound();
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/classes" />
          <h2>{madrasaClass.name}</h2>
          <span
            className={`badge${madrasaClass.status === "inactive" ? " badge-withdrawn" : ""}`}
          >
            {t(lang, `class.status.${madrasaClass.status}`)}
          </span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.dept")}</span>
            <span>{t(lang, `dept.${madrasaClass.department}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "classes.section_filter")}</span>
            <span>{t(lang, `section.${madrasaClass.section}`)}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.sort_order")}</span>
            <span>{madrasaClass.sort_order.toLocaleString("ur-PK")}</span>
          </div>
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <span>{t(lang, `class.status.${madrasaClass.status}`)}</span>
          </div>
        </div>

        <h3 className="form-section-title">
          {t(lang, "student.detail.edit_title")}
        </h3>
        <ClassForm
          initial={madrasaClass}
          action={updateClass.bind(null, madrasaClass.id)}
          submitLabel={t(lang, "student.form.update")}
          cancelHref="/departments/classes"
          showStatus
          lang={lang}
        />

      </div>
    </div>
  );
}
