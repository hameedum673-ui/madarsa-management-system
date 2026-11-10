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
  DEPARTMENT_LABELS,
  type DepartmentId,
  type Student,
} from "@/lib/students";

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

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>طلبہ کے شناختی کارڈ</h2>
          <span className="page-count">
            کل فعال: {students.length.toLocaleString("ur-PK")}
          </span>
        </div>

        <p className="form-note">
          کارڈ پرچی جیسا چھوٹا ہوگا — کارڈ والے صفحے پر "تصویر محفوظ کریں" سے
          کارڈ تصویر کے طور پر محفوظ ہو جائے گا۔
        </p>

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
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>

        {tableMissing ? (
          <p className="empty-state">
            طلبہ کی میز ابھی نہیں بنی — پہلے مرحلہ 4 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : students.length === 0 ? (
          <p className="empty-state">
            اس شعبے میں ابھی کوئی فعال طالبہ درج نہیں ہے۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>رجسٹریشن نمبر</th>
                  <th>نام</th>
                  <th>والد کا نام</th>
                  <th>شعبہ</th>
                  <th>جماعت</th>
                  <th>داخلہ</th>
                  <th>کارڈ</th>
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
                    <td>{DEPARTMENT_LABELS[s.department]}</td>
                    <td>{s.class_name ?? "—"}</td>
                    <td>{formatDate(s.admission_date)}</td>
                    <td>
                      <Link href={`/departments/idcards/${s.id}`}>
                        کارڈ دیکھیں
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
