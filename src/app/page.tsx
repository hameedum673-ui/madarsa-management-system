import TopBar from "@/components/TopBar";
import StatsRow from "@/components/StatsRow";
import DepartmentGroups from "@/components/DepartmentGroups";
import { createClient } from "@/lib/supabase/server";

/** مین ڈیش بورڈ — منظور شدہ ڈیزائن جوں کا توں */
export default async function DashboardPage() {
  // مرحلہ 4/5 — «کل طلبہ» اور «کل اساتذہ» اصل تعداد دکھاتے ہیں (صرف فعال)۔
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

  return (
    <>
      <TopBar />
      <StatsRow studentsCount={totalStudents} teachersCount={totalTeachers} />
      <DepartmentGroups />
      <footer className="foot">
        مدرسہ سیدہ عائشہ صدیقہ <span className="gold">(رضی اللہ عنہا)</span> للبنات — شادی
        لارج، ضلع بدین، سندھ
      </footer>
    </>
  );
}
