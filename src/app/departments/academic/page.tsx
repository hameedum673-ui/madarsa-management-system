/**
 * مرحلہ 15 — تعلیمی ریکارڈ: فعال طلبہ کی فہرست (سرور صفحہ)
 * صرف دیکھنے کا صفحہ ہے — ہر نام پر ٹیپ کرنے سے اس طالبہ کا مکمل تعلیمی
 * ریکارڈ کھلتا ہے۔ کوئی نئی میز نہیں — یہ فہرست students میز سے بنتی ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  type DepartmentId,
  type Student,
} from "@/lib/students";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function AcademicPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string }>;
}) {
  const params = await searchParams;
  const rawDepartment = params.department ?? "all";
  const department: DepartmentId | "all" = (
    DEPARTMENT_IDS as string[]
  ).includes(rawDepartment)
    ? (rawDepartment as DepartmentId)
    : "all";

  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const [allowedSections, lang] = await Promise.all([
    getMyAllowedSections(supabase),
    getMyLanguage(),
  ]);
  let query = supabase
    .from("students")
    .select("*")
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  if (department !== "all") query = query.eq("department", department);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  const { data, error } = await query;

  const students = (data ?? []) as Student[];

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.academic")}</h2>
          <span className="page-count">
            {t(lang, "students.count_total", {
              n: students.length.toLocaleString("ur-PK"),
            })}
          </span>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "col.dept")}</span>
            <select
              className="field-input"
              name="department"
              defaultValue={department}
            >
              <option value="all">{t(lang, "common.all")}</option>
              {DEPARTMENT_IDS.map((d) => (
                <option key={d} value={d}>
                  {t(lang, `dept.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            {t(lang, "common.show")}
          </button>
        </form>

        {error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            {t(lang, "academic.empty")}
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "col.reg")}</th>
                  <th>{t(lang, "col.name")}</th>
                  <th>{t(lang, "col.father")}</th>
                  <th>{t(lang, "col.dept")}</th>
                  <th>{t(lang, "col.class")}</th>
                  <th>{t(lang, "student.detail.admission_date")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/academic/${s.id}`}>
                        {s.registration_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/academic/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td>{t(lang, `dept.${s.department}`)}</td>
                    <td>{s.class_name || "—"}</td>
                    <td>{formatDate(s.admission_date)}</td>
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
