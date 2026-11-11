import TopBar from "@/components/TopBar";
import StatsRow from "@/components/StatsRow";
import DepartmentGroups from "@/components/DepartmentGroups";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { ROLE_LABELS } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";
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

  // مرحلہ 51 — بنین / بنات کی الگ گنتی (فعال طلبہ اور اساتذہ)
  // میز میں section والا کالم نہ ہو (SQL نہ چلی ہو) تو گنتی صفر رہتی ہے۔
  let studentsBanin = 0;
  let studentsBanat = 0;
  try {
    const { count: cBanin } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("section", "banin");
    const { count: cBanat } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("section", "banat");
    studentsBanin = cBanin ?? 0;
    studentsBanat = cBanat ?? 0;
  } catch {
    studentsBanin = 0;
    studentsBanat = 0;
  }

  let teachersBanin = 0;
  let teachersBanat = 0;
  try {
    const { count: cBanin } = await supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("section", "banin");
    const { count: cBanat } = await supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("section", "banat");
    teachersBanin = cBanin ?? 0;
    teachersBanat = cBanat ?? 0;
  } catch {
    teachersBanin = 0;
    teachersBanat = 0;
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

  // مرحلہ 8 + مرحلہ 16 + مرحلہ 20 + مرحلہ 48 (وکالت کا اصول) — مالی بیلنس:
  // فعال فیس + فعال عطیات + زکوٰۃ (وصولی) + عشر (وصولی)
  // مائنس فعال اخراجات۔ منسوخ ریکارڈ نہیں گنے جاتے۔
  // (مرحلہ 49 — تقسیم ختم، صرف وصولی گنی جاتی ہے)
  let balance: { value: number; hasPayments: boolean } | null = null;
  try {
    const { data: payments } = await supabase
      .from("fee_payments")
      .select("amount")
      .eq("status", "active");
    const feeRows = (payments ?? []) as { amount: number }[];
    const { data: given } = await supabase
      .from("donations")
      .select("amount")
      .eq("status", "active");
    const donationRows = (given ?? []) as { amount: number }[];
    const { data: spent } = await supabase
      .from("expenses")
      .select("amount")
      .eq("status", "active");
    const expenseRows = (spent ?? []) as { amount: number }[];
    const { data: zakatData } = await supabase
      .from("zakat_records")
      .select("kind, amount")
      .eq("status", "active");
    const zakatRows = (zakatData ?? []) as { kind: string; amount: number }[];
    const { data: ushrData } = await supabase
      .from("ushr_records")
      .select("kind, amount")
      .eq("status", "active");
    const ushrRows = (ushrData ?? []) as { kind: string; amount: number }[];
    const feesTotal = feeRows.reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const donationsTotal = donationRows.reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0,
    );
    const expensesTotal = expenseRows.reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0,
    );
    // مرحلہ 49 — تقسیم ختم: زکوٰۃ/عشر صرف "وصولی" گنے جاتے ہیں
    const zakatNet = zakatRows
      .filter((r) => r.kind === "received")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const ushrNet = ushrRows
      .filter((r) => r.kind === "received")
      .reduce((sum, r) => sum + (r.amount ?? 0), 0);
    balance = {
      value: feesTotal + donationsTotal + zakatNet + ushrNet - expensesTotal,
      hasPayments:
        feeRows.length > 0 ||
        donationRows.length > 0 ||
        expenseRows.length > 0 ||
        zakatRows.length > 0 ||
        ushrRows.length > 0,
    };
  } catch {
    balance = null;
  }

  // مرحلہ 24 — مدرسے کا نام اور پتہ ڈیٹا بیس سے (عمومی ریکارڈ سے بدلتا ہے)۔
  // نہ ملے تو پرانا لکھا ہوا نام دکھایا جاتا ہے، صفحہ نہیں ٹوٹتا۔
  // مرحلہ 25 — لاگ اِن صارف کا نام/کردار بھی (اوپر والے مینو کے لیے)۔
  // مرحلہ 26 — بند شعبوں کی فہرست (صرف عام صارف کے لیے)۔
  let madrasaName: string | null = null;
  let madrasaAddress: string | null = null;
  let userName: string | null = null;
  let userRole: string | null = null;
  let isAdmin = false;
  let deniedModules: string[] = [];
  // مرحلہ 32 — گھنٹی کے لیے تازہ فعال اطلاعات (زیادہ سے زیادہ 5)
  let recentNotices: {
    id: string;
    title: string;
    kind: string;
    notice_date: string;
  }[] = [];
  let activeNoticesCount = 0;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: madrasa } = await supabase
        .from("madrasas")
        .select("name")
        .eq("id", mine.madrasaId)
        .single();
      if (madrasa?.name) madrasaName = madrasa.name as string;
      const { data: profile } = await supabase
        .from("madrasa_profile")
        .select("address")
        .eq("madrasa_id", mine.madrasaId)
        .single();
      if (profile?.address) madrasaAddress = profile.address as string;
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", mine.userId)
        .single();
      if (myProfile?.name) userName = myProfile.name as string;
      if (myProfile?.role) {
        userRole = ROLE_LABELS[myProfile.role as MadrasaRole] ?? null;
        isAdmin = myProfile.role === "super_admin";
      }
      // بند شعبے — صرف عام صارف کے لیے (ایڈمن کو سب کچھ نظر آتا ہے)
      if (!isAdmin) {
        const { data: denied } = await supabase
          .from("user_permissions")
          .select("module")
          .eq("allowed", false);
        deniedModules = ((denied ?? []) as { module: string }[]).map(
          (d) => d.module,
        );
      }
      // مرحلہ 32 — گھنٹی کے لیے تازہ فعال اطلاعات (میز نہ بنی ہو تو خالی)
      const { data: noticeRows } = await supabase
        .from("notices")
        .select("id, title, kind, notice_date")
        .eq("status", "active")
        .order("notice_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      recentNotices = ((noticeRows ?? []) as {
        id: string;
        title: string;
        kind: string;
        notice_date: string;
      }[]).map((n) => ({
        id: n.id,
        title: n.title,
        kind: n.kind,
        notice_date: n.notice_date,
      }));
      const { count: noticeCount } = await supabase
        .from("notices")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      activeNoticesCount = noticeCount ?? 0;
    }
  } catch {
    madrasaName = null;
    madrasaAddress = null;
    userName = null;
    userRole = null;
    isAdmin = false;
    deniedModules = [];
    recentNotices = [];
    activeNoticesCount = 0;
  }

  return (
    <>
      <TopBar
        madrasaName={madrasaName}
        isAdmin={isAdmin}
        userName={userName}
        userRole={userRole}
        notices={recentNotices}
        noticesCount={activeNoticesCount}
      />
      <StatsRow
        studentsCount={totalStudents}
        teachersCount={totalTeachers}
        studentsBanin={studentsBanin}
        studentsBanat={studentsBanat}
        teachersBanin={teachersBanin}
        teachersBanat={teachersBanat}
        attendanceToday={attendanceToday}
        balance={balance}
      />
      <DepartmentGroups isAdmin={isAdmin} deniedModules={deniedModules} />
      <footer className="foot">
        {madrasaName ? (
          <>
            {madrasaName} — {madrasaAddress ?? "شادی لارج، ضلع بدین، سندھ"}
          </>
        ) : (
          <>
            مدرسہ سیدہ عائشہ صدیقہ <span className="gold">(رضی اللہ عنہا)</span>{" "}
            للبنات — شادی لارج، ضلع بدین، سندھ
          </>
        )}
      </footer>
    </>
  );
}
