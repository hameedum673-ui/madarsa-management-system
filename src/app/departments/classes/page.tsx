/**
 * مرحلہ 14 — درجات اور جماعتوں کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کی جماعتیں نظر آتی ہیں — RLS پالیسی یہ یقین دلاتی ہے۔
 * فہرست شعبے کے حساب سے ترتیب وار ہے (پہلے شعبہ، پھر ترتیب نمبر)۔
 * میز ابھی نہ بنی ہو (migration 011 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
  SECTION_IDS,
  SECTION_LABELS,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";
import { CLASS_STATUS_LABELS, type MadrasaClass } from "@/lib/classes";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ department?: string; section?: string }>;
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
  const allowedSections = await getMyAllowedSections(supabase);
  let query = supabase
    .from("classes")
    .select("*")
    .order("department", { ascending: true })
    .order("sort_order", { ascending: true });
  if (department !== "all") query = query.eq("department", department);
  // مرحلہ 51 — شعبے کا فلٹر (پہلے سے "سب")
  const rawSection = params.section ?? "all";
  const section: SectionId | "all" =
    (SECTION_IDS as string[]).includes(rawSection) &&
    allowedSections.has(rawSection as SectionId)
      ? (rawSection as SectionId)
      : "all";
  if (section !== "all") query = query.eq("section", section);
  if (allowedSections.size < 2)
    query = query.eq("section", [...allowedSections][0] ?? "__none__");
  const { data, error } = await query;

  const classes = (data ?? []) as MadrasaClass[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>درجات اور جماعتیں</h2>
          <span className="page-count">
            کل: {classes.length.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/classes/new">
            + نئی جماعت شامل کریں
          </Link>
        </div>

        <form className="att-controls" method="get">
          <label className="field">
            <span className="field-label">شعبہ</span>
            <select
              className="field-input"
              name="department"
              defaultValue={department}
            >
              <option value="all">سب</option>
              {DEPARTMENT_IDS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">شعبہ (بنین / بنات)</span>
            <select
              className="field-input"
              name="section"
              defaultValue={section}
            >
              <option value="all">سب</option>
              {SECTION_IDS.filter((s) => allowedSections.has(s)).map((s) => (
                <option key={s} value={s}>
                  {SECTION_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            جماعتوں کی میز ابھی نہیں بنی — پہلے مرحلہ 14 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : classes.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی جماعت درج نہیں ہے۔ اوپر والے بٹن سے پہلی جماعت شامل کریں۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ترتیب نمبر</th>
                  <th>جماعت کا نام</th>
                  <th>شعبہ</th>
                  <th>بنین / بنات</th>
                  <th>حالت</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td>{c.sort_order.toLocaleString("ur-PK")}</td>
                    <td>
                      <Link href={`/departments/classes/${c.id}`}>
                        {c.name}
                      </Link>
                    </td>
                    <td>{DEPARTMENT_LABELS[c.department]}</td>
                    <td>{SECTION_LABELS[c.section]}</td>
                    <td>
                      <span
                        className={`badge${c.status === "inactive" ? " badge-withdrawn" : ""}`}
                      >
                        {CLASS_STATUS_LABELS[c.status]}
                      </span>
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
