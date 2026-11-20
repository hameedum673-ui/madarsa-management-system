/**
 * تعلیمی سال کی بنیاد — مددگار (migration 056)
 *
 * سال ہجری ہے: نیا سال 10 شوال سے شروع، رجب کے آخر تک؛ شعبان +
 * رمضان چھٹیاں۔ سال کا لیبل اس کے شوال والا ہجری سال (جیسے "1447ھ")۔
 *
 * یہ مددگار کبھی غلطی نہیں پھینکتے: سال نہ بنا ہو یا migration
 * ابھی نہ چلی ہو تو خاموشی سے کچھ نہیں کرتے — تاکہ داخلہ اور
 * ریکارڈ کی تبدیلی کبھی ان کی وجہ سے نہ رکے۔
 */
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AcademicYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

/** اپنے مدرسے کے تمام سال — موجودہ پہلے، پھر پرانے (شروع کی تاریخ کے لحاظ سے) */
export async function getAllAcademicYears(
  supabase: ServerClient,
  madrasaId: string,
): Promise<AcademicYear[]> {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, label, start_date, end_date, is_current")
      .eq("madrasa_id", madrasaId)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false });
    if (error || !data) return [];
    return data as AcademicYear[];
  } catch {
    return [];
  }
}

/** اپنے مدرسے کے پرانے سال (موجودہ نہیں) — شروع کی تاریخ کے لحاظ سے نئے سے پرانے */
export async function getPastAcademicYears(
  supabase: ServerClient,
  madrasaId: string,
): Promise<AcademicYear[]> {
  const all = await getAllAcademicYears(supabase, madrasaId);
  return all.filter((y) => !y.is_current);
}

export interface PastEnrollment {
  year_id: string;
  label: string;
  start_date: string;
  class_name: string | null;
}

/** طالبہ کے پرانے سالوں کے داخلے — سال کے لیبل کے ساتھ، نئے سے پرانے */
export async function getStudentPastEnrollments(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
): Promise<PastEnrollment[]> {
  try {
    const years = await getPastAcademicYears(supabase, madrasaId);
    if (years.length === 0) return [];
    const byId = new Map(years.map((y) => [y.id, y]));
    const { data, error } = await supabase
      .from("enrollments")
      .select("academic_year_id, class_name")
      .eq("madrasa_id", madrasaId)
      .eq("student_id", studentId)
      .in(
        "academic_year_id",
        years.map((y) => y.id),
      );
    if (error || !data) return [];
    return (data as { academic_year_id: string; class_name: string | null }[])
      .map((row) => {
        const year = byId.get(row.academic_year_id);
        if (!year) return null;
        return {
          year_id: year.id,
          label: year.label,
          start_date: year.start_date,
          class_name: row.class_name,
        };
      })
      .filter((row): row is PastEnrollment => row !== null)
      .sort((a, b) => (a.start_date < b.start_date ? 1 : -1));
  } catch {
    return [];
  }
}

/** اپنے مدرسے کا موجودہ سال (نہ ہو تو null) */
export async function getCurrentAcademicYear(
  supabase: ServerClient,
  madrasaId: string,
): Promise<AcademicYear | null> {
  try {
    const { data, error } = await supabase
      .from("academic_years")
      .select("id, label, start_date, end_date, is_current")
      .eq("madrasa_id", madrasaId)
      .eq("is_current", true)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return data[0] as AcademicYear;
  } catch {
    return null;
  }
}

/**
 * تاریخ سے تعلیمی سال نکالیں — خالص حساب (migration 057 کے
 * امتحان والے اصول جیسا؛ جانچ کے لیے الگ رکھا گیا ہے)۔
 * تاریخیں ISO شکل (YYYY-MM-DD) میں ہیں، اس لیے لفظی موازنہ درست ہے۔
 *
 *   * تاریخ کسی سال کے اندر (start_date..end_date) → وہی سال
 *   * تاریخ شعبان–رمضان کے وقفے میں (کوئی سال ختم ہو چکا، اگلا ابھی
 *     شروع نہیں ہوا) → آنے والا سال (وقفے میں آنے والا سال ہی
 *     موجودہ مانا جاتا ہے)
 *   * ورنہ → null (پہلے سال سے بھی پرانی تاریخ، یا آنے والا سال
 *     ابھی بنا ہی نہیں)
 */
export function pickAcademicYearForDate(
  years: AcademicYear[],
  date: string,
): AcademicYear | null {
  if (years.length === 0 || !date) return null;
  const inside = years.find(
    (y) => date >= y.start_date && date <= y.end_date,
  );
  if (inside) return inside;
  const ended = years.some((y) => y.end_date < date);
  if (!ended) return null;
  const upcoming = [...years]
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
    .find((y) => y.start_date > date);
  return upcoming ?? null;
}

/**
 * تاریخ سے اپنے مدرسے کے تعلیمی سال کا id نکالیں — امتحان بناتے /
 * بدلتے وقت سال تاریخ سے خود لگتا ہے۔ سال نہ بنا ہو یا migration
 * ابھی نہ چلی ہو تو null — کبھی نہیں پھینکتا۔
 */
export async function deriveAcademicYearId(
  supabase: ServerClient,
  madrasaId: string,
  date: string,
): Promise<string | null> {
  try {
    const years = await getAllAcademicYears(supabase, madrasaId);
    const year = pickAcademicYearForDate(years, date);
    return year ? year.id : null;
  } catch {
    return null;
  }
}

/**
 * طالبہ کو موجودہ سال میں درج کریں (یا جماعت بدلیں) — ایک طالبہ،
 * ایک سال، ایک قطار۔ سال نہ ہو تو کچھ نہیں ہوتا۔ کبھی نہیں پھینکتا۔
 */
export async function upsertEnrollment(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
  className: string | null,
  department: string,
  section: string,
): Promise<void> {
  try {
    const year = await getCurrentAcademicYear(supabase, madrasaId);
    if (!year) return;
    await supabase.from("enrollments").upsert(
      {
        madrasa_id: madrasaId,
        student_id: studentId,
        academic_year_id: year.id,
        class_name: className,
        department,
        section,
      },
      { onConflict: "student_id,academic_year_id" },
    );
  } catch {
    // سال کی میز نہ ہو یا کوئی خرابی ہو — اصل کام نہیں رکنا چاہیے
  }
}

/**
 * طالبہ کو بتائے ہوئے سال میں درج کریں (یا جماعت بدلیں) — ایک طالبہ،
 * ایک سال، ایک قطار۔ سال کا id صاف طور پر دیا جاتا ہے (موجودہ سال کی
 * شرط نہیں) — پرانے سالوں کے داخلے کے لیے۔ کبھی نہیں پھینکتا۔
 */
export async function upsertEnrollmentForYear(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
  yearId: string,
  className: string | null,
  department: string,
  section: string,
): Promise<void> {
  try {
    await supabase.from("enrollments").upsert(
      {
        madrasa_id: madrasaId,
        student_id: studentId,
        academic_year_id: yearId,
        class_name: className,
        department,
        section,
      },
      { onConflict: "student_id,academic_year_id" },
    );
  } catch {
    // سال کی میز نہ ہو یا کوئی خرابی ہو — اصل کام نہیں رکنا چاہیے
  }
}

/**
 * ترقی (پروموشن) کا جائزہ — خالص حساب (جانچ کے لیے الگ رکھا گیا ہے)
 *
 * ہر فعال طالبہ کے لیے موجودہ سال کا اندراج دیکھیں: اگلی جماعت اسی
 * شعبے + اسی حصے کی ترتیب (sort_order) سے اگلی فعال جماعت ہے۔
 *   * اگلی جماعت ملے → rows (ترقی ہو گی)
 *   * نہ ملے (آخری جماعت، یا جماعت فہرست میں نہیں) → lastClass
 *   * موجودہ سال میں اندراج ہی نہیں → noEnrollment (ترقی نہیں ہو گی)
 */
export interface PromotionInputStudent {
  id: string;
  name: string;
  father_name: string;
  registration_number: string;
  class_name: string | null;
  department: string;
  section: string;
}

export interface PromotionInputEnrollment {
  student_id: string;
  class_name: string | null;
  department: string;
  section: string;
}

export interface PromotionInputClass {
  name: string;
  department: string;
  section: string;
  sort_order: number;
}

export interface PromotionRow {
  student_id: string;
  name: string;
  father_name: string;
  registration_number: string;
  current_class: string | null;
  department: string;
  section: string;
  next_class: string | null;
}

export interface PromotionNoEnrollmentRow {
  student_id: string;
  name: string;
  father_name: string;
  registration_number: string;
  class_name: string | null;
  department: string;
  section: string;
}

export interface PromotionPreview {
  rows: PromotionRow[];
  lastClass: PromotionRow[];
  noEnrollment: PromotionNoEnrollmentRow[];
}

export function buildPromotionPreview(
  students: PromotionInputStudent[],
  enrollments: PromotionInputEnrollment[],
  classes: PromotionInputClass[],
): PromotionPreview {
  const byStudent = new Map(enrollments.map((e) => [e.student_id, e]));
  const byDeptSection = new Map<string, PromotionInputClass[]>();
  for (const c of classes) {
    const key = `${c.department}|${c.section}`;
    const list = byDeptSection.get(key) ?? [];
    list.push(c);
    byDeptSection.set(key, list);
  }
  for (const list of byDeptSection.values()) {
    list.sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        (a.name < b.name ? -1 : a.name > b.name ? 1 : 0),
    );
  }
  const rows: PromotionRow[] = [];
  const lastClass: PromotionRow[] = [];
  const noEnrollment: PromotionNoEnrollmentRow[] = [];
  for (const s of students) {
    const enr = byStudent.get(s.id);
    if (!enr) {
      noEnrollment.push({
        student_id: s.id,
        name: s.name,
        father_name: s.father_name,
        registration_number: s.registration_number,
        class_name: s.class_name,
        department: s.department,
        section: s.section,
      });
      continue;
    }
    const current = enr.class_name;
    const list = byDeptSection.get(`${enr.department}|${enr.section}`) ?? [];
    const idx = current ? list.findIndex((c) => c.name === current) : -1;
    const next =
      idx >= 0 && idx + 1 < list.length ? list[idx + 1].name : null;
    const row: PromotionRow = {
      student_id: s.id,
      name: s.name,
      father_name: s.father_name,
      registration_number: s.registration_number,
      current_class: current,
      department: enr.department,
      section: enr.section,
      next_class: next,
    };
    if (next === null) lastClass.push(row);
    else rows.push(row);
  }
  return { rows, lastClass, noEnrollment };
}

/**
 * سال کی رپورٹ — طالبات کی گنتی (خالص حساب، جانچ کے لیے الگ)
 * اندراج کی قطاریں (ایک طالبہ، ایک سال، ایک قطار) → کل/فعال/خارج
 * + شعبے کے حساب سے + جماعت کے حساب سے (جماعت + شعبہ + حصہ)۔
 * جماعت نہ لکھی ہو تو noClassLabel دکھتا ہے۔
 */
export interface YearSummaryEnrollment {
  class_name: string | null;
  department: string;
  section: string;
  status: string;
}

export interface YearSummaryDepartmentRow {
  department: string;
  active: number;
  withdrawn: number;
  total: number;
}

export interface YearSummaryClassRow {
  class_name: string;
  department: string;
  section: string;
  active: number;
  withdrawn: number;
  total: number;
}

export interface YearSummary {
  total: number;
  active: number;
  withdrawn: number;
  byDepartment: YearSummaryDepartmentRow[];
  byClass: YearSummaryClassRow[];
}

export function buildYearSummary(
  enrollments: YearSummaryEnrollment[],
  noClassLabel: string,
): YearSummary {
  let active = 0;
  let withdrawn = 0;
  const deptMap = new Map<string, { active: number; withdrawn: number }>();
  const classMap = new Map<string, YearSummaryClassRow>();
  for (const e of enrollments) {
    const isWithdrawn = e.status === "withdrawn";
    if (isWithdrawn) withdrawn++;
    else active++;
    const d = deptMap.get(e.department) ?? { active: 0, withdrawn: 0 };
    if (isWithdrawn) d.withdrawn++;
    else d.active++;
    deptMap.set(e.department, d);
    const className = e.class_name ?? noClassLabel;
    const key = `${e.department}|${e.section}|${className}`;
    const c = classMap.get(key) ?? {
      class_name: className,
      department: e.department,
      section: e.section,
      active: 0,
      withdrawn: 0,
      total: 0,
    };
    if (isWithdrawn) c.withdrawn++;
    else c.active++;
    c.total++;
    classMap.set(key, c);
  }
  const byDepartment = [...deptMap.entries()]
    .map(([department, v]) => ({
      department,
      active: v.active,
      withdrawn: v.withdrawn,
      total: v.active + v.withdrawn,
    }))
    .sort((a, b) => (a.department < b.department ? -1 : 1));
  const byClass = [...classMap.values()].sort((a, b) =>
    a.department !== b.department
      ? a.department < b.department
        ? -1
        : 1
      : a.section !== b.section
        ? a.section < b.section
          ? -1
          : 1
        : a.class_name < b.class_name
          ? -1
          : 1,
  );
  return { total: active + withdrawn, active, withdrawn, byDepartment, byClass };
}
