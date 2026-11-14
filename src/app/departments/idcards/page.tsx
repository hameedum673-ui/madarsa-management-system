/**
 * مرحلہ 12 — طلبہ کے شناختی کارڈوں کی فہرست (سرور صفحہ)
 * صرف فعال طلبہ نظر آتی ہیں — خارج شدہ طالبہ کا کارڈ نہیں بنتا۔
 * کارڈ طلبہ کی موجودہ میز سے ہی بنتا ہے، اس لیے کوئی نئی میز نہیں۔
 * میز ابھی نہ بنی ہو (migration 002 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
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

export default async function IdCardsPage({
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
  const langP = getMyLanguage();
  let query = supabase
    .from("students")
    .select("*")
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  if (department !== "all") query = query.eq("department", department);
  const { data, error } = await query;

  const students = (data ?? []) as Student[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/students-idcards" />
          <h2>{t(lang, "module.idcards")}</h2>
          <span className="page-count">
            {t(lang, "idcards.count_active", {
              n: students.length.toLocaleString("ur-PK"),
            })}
          </span>
        </div>

        <p className="form-note">{t(lang, "idcards.note")}</p>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">{t(lang, "idcards.filter_dept")}</span>
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

        {tableMissing ? (
          <p className="empty-state">{t(lang, "students.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : students.length === 0 ? (
          <p className="empty-state">{t(lang, "idcards.empty")}</p>
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
                  <th>{t(lang, "col.admission_date")}</th>
                  <th>{t(lang, "idcards.col.card")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/departments/idcards/${s.id}`}>
                        {s.registration_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/idcards/${s.id}`}>
                        {s.name}
                      </Link>
                    </td>
                    <td>{s.father_name}</td>
                    <td>{t(lang, `dept.${s.department}`)}</td>
                    <td>{s.class_name ?? "—"}</td>
                    <td>{formatDate(s.admission_date)}</td>
                    <td>
                      <Link href={`/departments/idcards/${s.id}`}>
                        {t(lang, "idcards.view_card")}
                      </Link>
                    </td>
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
