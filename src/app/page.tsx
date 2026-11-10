import TopBar from "@/components/TopBar";
import StatsRow from "@/components/StatsRow";
import DepartmentGroups from "@/components/DepartmentGroups";
import { createClient } from "@/lib/supabase/server";
import { todayInKarachi } from "@/lib/attendance";

/** مین ڈیش بورڈ — منظور شدہ ڈیزائن جوں کا توں */
export default async function DashboardPage() {
  // مرحلہ 4/5/6 — «کل طلبہ»، «کل اساتذہ» اور «آج کی حاضری» اصل تعداد دکھاتے ہیں۔
  // میز نہ بنی ہو یا کوئی خرابی ہو تو صفر دکھایا جاتا ہے، صفحہ نہیں ٹوٹتا۔
  const supabase = await createClient();

  let totalStudents = 0;
  try {
    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    totalStudents = count ?? 0;
  } catch {
    totalStudents = 0;
  }

  let totalTeachers = 0;
  try {
    const { count } = await supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    totalTeachers = count ?? 0;
  } catch {
    totalTeachers = 0;
  }

  // آج کی حاضری — پاکستان کی تاریخ کے حساب سے
  let attendanceToday: { present: number; total: number; marked: number } | null =
    null;
  try {
    const today = todayInKarachi();
    const { count: presentCount } = await supabase
      .from("student_attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today)
      .eq("status", "present");
    const { count: markedCount } = await supabase
      .from("student_attendance")
      .select("id", { count: "exact", head: true })
      .eq("date", today);
    attendanceToday = {
      present: presentCount ?? 0,
      total: totalStudents,
      marked: markedCount ?? 0,
    };
  } catch {
    attendanceToday = null;
  }

  // مرحلہ 8 + مرحلہ 16 — مالی بیلنس: فعال فیس رسیدوں کی کل رقم
  // مائنس فعال اخراجات کی کل رقم۔ منسوخ رسید اور منسوخ خرچ نہیں گنے جاتے۔
  let balance: { value: number; hasPayments: boolean } | null = null;
  try {
    const { data: payments } = await supabase
      .from("fee_payments")
      .select("amount")
      .eq("status", "active");
    const feeRows = (payments ?? []) as { amount: number }[];
    const { data: spent } = await supabase
      .from("expenses")
      .select("amount")
      .eq("status", "active");
    const expenseRows = (spent ?? []) as { amount: number }[];
    const feesTotal = feeRows.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const expensesTotal = expenseRows.reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0,
    );
    balance = {
      value: feesTotal - expensesTotal,
      hasPayments: feeRows.length > 0 || expenseRows.length > 0,
    };
  } catch {
    balance = null;
  }

  return (
    <>
      <TopBar />
      <StatsRow
        studentsCount={totalStudents}
        teachersCount={totalTeachers}
        attendanceToday={attendanceToday}
        balance={balance}
      />
      <DepartmentGroups />
      <footer className="foot">
        مدرسہ سیدہ عائشہ صدیقہ <span className="gold">(رضی اللہ عنہا)</span> للبنات — شادی
        لارج، ضلع بدین، سندھ
      </footer>
    </>
  );
}
