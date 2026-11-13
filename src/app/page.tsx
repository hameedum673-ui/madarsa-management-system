import TopBar from "@/components/TopBar";
import StatsRow from "@/components/StatsRow";
import DepartmentGroups from "@/components/DepartmentGroups";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import { getMyMadrasa, type SectionId } from "@/lib/students";
import { ROLE_LABELS } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";
import { todayInKarachi } from "@/lib/attendance";

/** مین ڈیش بورڈ — منظور شدہ ڈیزائن جوں کا توں */
export default async function DashboardPage() {
  // مرحلہ 4/5/6 — «کل طلبہ»، «کل اساتذہ» اور «آج کی حاضری» اصل تعداد دکھاتے ہیں۔
  // میز نہ بنی ہو یا کوئی خرابی ہو تو صفر دکھایا جاتا ہے، صفحہ نہیں ٹوٹتا۔
  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const allowedSections = await getMyAllowedSections(supabase);

  let totalStudents = 0;
  try {
    let studentsQuery = supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (allowedSections.size < 2) {
      studentsQuery = studentsQuery.eq(
        "section",
        [...allowedSections][0] ?? "__none__",
      );
    }
    const { count } = await studentsQuery;
    totalStudents = count ?? 0;
  } catch {
    totalStudents = 0;
  }

  let totalTeachers = 0;
  try {
    let teachersQuery = supabase
      .from("teachers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (allowedSections.size < 2) {
      teachersQuery = teachersQuery.eq(
        "section",
        [...allowedSections][0] ?? "__none__",
      );
    }
    const { count } = await teachersQuery;
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
    studentsBanin = allowedSections.has("banin") ? (cBanin ?? 0) : 0;
    studentsBanat = allowedSections.has("banat") ? (cBanat ?? 0) : 0;
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
    teachersBanin = allowedSections.has("banin") ? (cBanin ?? 0) : 0;
    teachersBanat = allowedSections.has("banat") ? (cBanat ?? 0) : 0;
  } catch {
    teachersBanin = 0;
    teachersBanat = 0;
  }

  // آج کی حاضری — پاکستان کی تاریخ کے حساب سے
  // (مرحلہ 54 — محدود صارف کو صرف اجازت والے شعبے کی حاضری دکھے)
  let attendanceToday: { present: number; total: number; marked: number } | null =
    null;
  try {
    const today = todayInKarachi();
    if (allowedSections.size === 0) {
      attendanceToday = { present: 0, total: totalStudents, marked: 0 };
    } else if (allowedSections.size < 2) {
      // محدود صارف — آج کی حاضری کی قطاریں پڑھ کر شعبے کے حساب سے گنیں
      const { data: attRows } = await supabase
        .from("student_attendance")
        .select("status, students(section)")
        .eq("date", today);
      const allowedRows = (
        (attRows ?? []) as unknown as {
          status: string;
          students: { section: string } | null;
        }[]
      ).filter((r) =>
        allowedSections.has((r.students?.section ?? "banat") as SectionId),
      );
      attendanceToday = {
        present: allowedRows.filter((r) => r.status === "present").length,
        total: totalStudents,
        marked: allowedRows.length,
      };
    } else {
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
    }
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
      .select("amount, students(section)")
      .eq("status", "active");
    // مرحلہ 54 — بیلنس میں فیس صرف اجازت والے شعبے کی
    const feeRows = (
      (payments ?? []) as unknown as {
        amount: number;
        students: { section: string } | null;
      }[]
    ).filter((p) =>
      allowedSections.has((p.students?.section ?? "banat") as SectionId),
    );
    const { data: given } = await supabase
      .from("donations")
      .select("amount, section")
      .eq("status", "active");
    // مرحلہ 62 — عطیات بھی صرف اجازت والے شعبے کے
    const donationRows = (
      (given ?? []) as { amount: number; section: string | null }[]
    ).filter((d) =>
      allowedSections.has((d.section ?? "banat") as SectionId),
    );
    const { data: spent } = await supabase
      .from("expenses")
      .select("amount, section")
      .eq("status", "active");
    // مرحلہ 62 — اخراجات بھی صرف اجازت والے شعبے کے
    const expenseRows = (
      (spent ?? []) as { amount: number; section: string | null }[]
    ).filter((e) =>
      allowedSections.has((e.section ?? "banat") as SectionId),
    );
    const { data: zakatData } = await supabase
      .from("zakat_records")
      .select("kind, amount, section")
      .eq("status", "active");
    // مرحلہ 62 — زکوٰۃ بھی صرف اجازت والے شعبے کی
    const zakatRows = (
      (zakatData ?? []) as {
        kind: string;
        amount: number;
        section: string | null;
      }[]
    ).filter((r) =>
      allowedSections.has((r.section ?? "banat") as SectionId),
    );
    const { data: ushrData } = await supabase
      .from("ushr_records")
      .select("kind, amount, section")
      .eq("status", "active");
    // مرحلہ 62 — عشر بھی صرف اجازت والے شعبے کا
    const ushrRows = (
      (ushrData ?? []) as {
        kind: string;
        amount: number;
        section: string | null;
      }[]
    ).filter((r) =>
      allowedSections.has((r.section ?? "banat") as SectionId),
    );
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
  // مرحلہ 67 — مہمان ہو تو باقی وقت (نہ ہو تو خالی)
  let guestRemainingText: string | null = null;
  // مرحلہ 80 — بیک اپ کی یاددہانی (نہ ہو تو خالی)
  let backupReminderText: string | null = null;
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
        .select("name, role, guest_expires_at")
        .eq("id", mine.userId)
        .single();
      if (myProfile?.name) userName = myProfile.name as string;
      // مرحلہ 67 — مہمان کا باقی وقت (گھنٹے + منٹ)
      if (myProfile?.guest_expires_at) {
        const ms =
          new Date(myProfile.guest_expires_at as string).getTime() -
          Date.now();
        if (ms > 0) {
          const mins = Math.floor(ms / 60000);
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          guestRemainingText =
            h > 0
              ? `${h.toLocaleString("ur-PK")} گھنٹہ ${m.toLocaleString("ur-PK")} منٹ`
              : `${m.toLocaleString("ur-PK")} منٹ`;
        }
      }
      // مرحلہ 80 — بیک اپ کی یاددہانی (مہمان کو نہیں — اس کا ڈیٹا نمونہ ہے)
      if (!myProfile?.guest_expires_at) {
        const { data: lastBackup } = await supabase
          .from("backup_log")
          .select("downloaded_at")
          .order("downloaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastAt =
          (lastBackup?.downloaded_at as string | undefined) ?? null;
        if (!lastAt) {
          backupReminderText =
            "ابھی تک بیک اپ ڈاؤن لوڈ نہیں ہوا — ڈیٹا محفوظ رکھنے کے لیے بیک اپ ڈاؤن لوڈ کر لیں۔";
        } else {
          const days = Math.floor(
            (Date.now() - new Date(lastAt).getTime()) /
              (24 * 60 * 60 * 1000),
          );
          if (days > 30) {
            backupReminderText = `آخری بیک اپ کو ${days.toLocaleString("ur-PK")} دن ہو گئے ہیں — نیا بیک اپ ڈاؤن لوڈ کر لیں۔`;
          }
        }
      }
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
    backupReminderText = null;
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
      {guestRemainingText ? (
        <p className="guest-banner">
          ڈیمو — باقی وقت: {guestRemainingText} — وقت ختم ہونے پر ڈیمو
          خودبخود بند ہو جائے گا۔
        </p>
      ) : null}
      {backupReminderText ? (
        <p className="backup-banner">
          {backupReminderText}{" "}
          <a href="/departments/backup">بیک اپ صفحہ کھولیں</a>
        </p>
      ) : null}
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
            {madrasaName}
            {madrasaAddress ? <> — {madrasaAddress}</> : null}
          </>
        ) : (
          <>جامعہ منیجمنٹ سسٹم</>
        )}
      </footer>
    </>
  );
}
