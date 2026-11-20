/**
 * مرحلہ 14 — جماعت کی تفصیل اور تبدیلی کا صفحہ
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کی جماعت کھل سکتی ہے۔
 */
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
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

  // اس جماعت کے استاد — نہ ملیں تو خالی (صفحہ نہیں ٹوٹے گا)
  let classTeachers: {
    id: string;
    teacher_id: string;
    teacher_name: string;
    subject: string;
  }[] = [];
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: tcData } = await supabase
        .from("teacher_classes")
        .select("id, subject, teachers(id, name)")
        .eq("madrasa_id", mine.madrasaId)
        .eq("class_id", madrasaClass.id)
        .order("created_at", { ascending: true });
      classTeachers = (
        (tcData ?? []) as {
          id: string;
          subject: string;
          teachers: { id: string; name: string }[] | { id: string; name: string } | null;
        }[]
      ).map((r) => {
        const teacher = Array.isArray(r.teachers) ? r.teachers[0] : r.teachers;
        return {
          id: r.id,
          teacher_id: teacher?.id ?? "",
          teacher_name: teacher?.name ?? "—",
          subject: r.subject ?? "",
        };
      });
    }
  } catch {
    classTeachers = [];
  }

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

        <h3 className="form-section-title">
          {t(lang, "teacher.classes.teachers_title")}
        </h3>
        {classTeachers.length === 0 ? (
          <p className="sub">{t(lang, "teacher.classes.none")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "teacher.classes.subject")}</th>
                </tr>
              </thead>
              <tbody>
                {classTeachers.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.teacher_id ? (
                        <Link href={`/departments/teachers/${row.teacher_id}`}>
                          {row.teacher_name}
                        </Link>
                      ) : (
                        row.teacher_name
                      )}
                    </td>
                    <td>{row.subject === "" ? "—" : row.subject}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
