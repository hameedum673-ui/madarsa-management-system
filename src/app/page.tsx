import TopBar from "@/components/TopBar";
import StatsRow from "@/components/StatsRow";
import DepartmentGroups from "@/components/DepartmentGroups";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  getMyMadrasa,
  SECTION_IDS,
  type SectionId,
} from "@/lib/students";
import { ROLE_LABELS, isMadrasaOwner } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";
import { todayInKarachi } from "@/lib/attendance";

/** مین ڈیش بورڈ — منظور شدہ ڈیزائن جوں کا توں */
export default async function DashboardPage() {
  // مرحلہ 91 — سوالات ایک ساتھ: پہلے وہ 2 چیزیں جن پر باقی سب منحصر
  // ہے (اجازت والے شعبے + اپنی شناخت — دونوں ایک ساتھ)، پھر باقی سارے
  // سوال ایک ہی وقت میں (Promise.all)۔ پہلے ہر سوال ایک کے بعد ایک
  // پوچھا جاتا تھا — اسی لیے ڈیش بورڈ کھلنے میں 10 سے 15 سیکنڈ لگتے تھے۔
  // حساب، فلٹر اور غلطی پر طے شدہ جواب — سب ویسے ہی ہیں جیسے پہلے تھے۔
  const supabase = await createClient();
  // مرحلہ 54 — اجازت والے شعبے (بنین / بنات)
  const [allowedSections, mine] = await Promise.all([
    getMyAllowedSections(supabase).catch(
      () => new Set(SECTION_IDS) as Set<SectionId>,
    ),
    getMyMadrasa(supabase).catch(() => null),
  ]);
  const today = todayInKarachi();
  const sectionEq =
    allowedSections.size < 2
      ? ([...allowedSections][0] ?? "__none__")
      : null;

  // --- ہر سوال اپنی کوشش میں: ناکام ہو تو طے شدہ جواب، باقی نہیں رکتے ---
  // مرحلہ 97 — گنتیاں ایک سوال میں (get_dashboard_counts)۔ پرانے 9 سوال
  // حفاظتی جال کے طور پر legacyCounts میں باقی ہیں — RPC نہ چلے
  // (migration 050 ابھی نہیں چلی) تو وہی چلیں گے، عدد بالکل ویسے ہی رہیں گے۔
  const countsP = (async (): Promise<{
    students: { total: number; banin: number; banat: number };
    teachers: { total: number; banin: number; banat: number };
    classes: { total: number; banin: number; banat: number };
  } | null> => {
    try {
      const { data, error } = await supabase.rpc("get_dashboard_counts");
      if (error || !data || typeof data !== "object") return null;
      return data as {
        students: { total: number; banin: number; banat: number };
        teachers: { total: number; banin: number; banat: number };
        classes: { total: number; banin: number; banat: number };
      };
    } catch {
      return null;
    }
  })();

  const legacyCounts = async (): Promise<{
    totalStudents: number;
    totalTeachers: number;
    classesCountRaw: number;
    studentsBaninRaw: number;
    studentsBanatRaw: number;
    teachersBaninRaw: number;
    teachersBanatRaw: number;
    classesBaninRaw: number;
    classesBanatRaw: number;
  }> => {
    const countActive = async (
      table: "students" | "teachers" | "classes",
      section?: string,
    ) => {
      try {
        let q = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("status", "active");
        if (section) q = q.eq("section", section);
        const { count } = await q;
        return count ?? 0;
      } catch {
        return 0;
      }
    };
    const countActiveSection = async (
      table: "students" | "teachers" | "classes",
    ) => {
      try {
        let q = supabase
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq("status", "active");
        if (sectionEq) q = q.eq("section", sectionEq);
        const { count } = await q;
        return count ?? 0;
      } catch {
        return 0;
      }
    };
    const [
      totalStudents,
      totalTeachers,
      classesCountRaw,
      studentsBaninRaw,
      studentsBanatRaw,
      teachersBaninRaw,
      teachersBanatRaw,
      classesBaninRaw,
      classesBanatRaw,
    ] = await Promise.all([
      countActiveSection("students"),
      countActiveSection("teachers"),
      countActiveSection("classes"),
      countActive("students", "banin"),
      countActive("students", "banat"),
      countActive("teachers", "banin"),
      countActive("teachers", "banat"),
      countActive("classes", "banin"),
      countActive("classes", "banat"),
    ]);
    return {
      totalStudents,
      totalTeachers,
      classesCountRaw,
      studentsBaninRaw,
      studentsBanatRaw,
      teachersBaninRaw,
      teachersBanatRaw,
      classesBaninRaw,
      classesBanatRaw,
    };
  };

  // آج کی حاضری — پاکستان کی تاریخ کے حساب سے
  // (مرحلہ 54 — محدود صارف کو صرف اجازت والے شعبے کی حاضری دکھے)
  const attendanceP = (async (): Promise<{
    present: number;
    marked: number;
  } | null> => {
    try {
      if (allowedSections.size === 0) {
        return { present: 0, marked: 0 };
      }
      if (allowedSections.size < 2) {
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
        return {
          present: allowedRows.filter((r) => r.status === "present").length,
          marked: allowedRows.length,
        };
      }
      const [presentRes, markedRes] = await Promise.all([
        supabase
          .from("student_attendance")
          .select("id", { count: "exact", head: true })
          .eq("date", today)
          .eq("status", "present"),
        supabase
          .from("student_attendance")
          .select("id", { count: "exact", head: true })
          .eq("date", today),
      ]);
      return {
        present: presentRes.count ?? 0,
        marked: markedRes.count ?? 0,
      };
    } catch {
      return null;
    }
  })();

  // مرحلہ 24/25/26/32/67/80/84 — نام، پتہ، صارف، بند شعبے، اطلاعات، بیک اپ
  const madrasaNameP = (async (): Promise<string | null> => {
    if (!mine) return null;
    try {
      const { data: madrasa } = await supabase
        .from("madrasas")
        .select("name")
        .eq("id", mine.madrasaId)
        .single();
      return (madrasa?.name as string | undefined) ?? null;
    } catch {
      return null;
    }
  })();

  const madrasaAddressP = (async (): Promise<string | null> => {
    if (!mine) return null;
    try {
      const { data: profile } = await supabase
        .from("madrasa_profile")
        .select("address")
        .eq("madrasa_id", mine.madrasaId)
        .single();
      return (profile?.address as string | undefined) ?? null;
    } catch {
      return null;
    }
  })();

  // مرحلہ 98 — مدرسے کا لوگو (الگ سوال، تاکہ migration 051 نہ چلی ہو
  // تو صرف لوگو خالی رہے، پتہ/نام ویسے ہی ملیں)
  const madrasaLogoUrlP = (async (): Promise<string | null> => {
    if (!mine) return null;
    try {
      const { data: profile, error } = await supabase
        .from("madrasa_profile")
        .select("logo_url")
        .eq("madrasa_id", mine.madrasaId)
        .maybeSingle();
      if (error || !profile) return null;
      return (profile.logo_url as string | undefined) ?? null;
    } catch {
      return null;
    }
  })();

  const myProfileP = (async (): Promise<{
    name: string | null;
    role: string | null;
    guest_expires_at: string | null;
  } | null> => {
    if (!mine) return null;
    try {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, role, guest_expires_at")
        .eq("id", mine.userId)
        .single();
      if (!myProfile) return null;
      return {
        name: (myProfile.name as string | undefined) ?? null,
        role: (myProfile.role as string | undefined) ?? null,
        guest_expires_at:
          (myProfile.guest_expires_at as string | undefined) ?? null,
      };
    } catch {
      return null;
    }
  })();

  // حصہ 4 کی درستگی — مالک کی جانچ (Migration 043 نہ چلی ہو تو false)
  const isOwnerP = (async () => {
    if (!mine) return false;
    try {
      return await isMadrasaOwner(supabase);
    } catch {
      return false;
    }
  })();

  // مرحلہ 80/84 — بیک اپ کی یاددہانی (دستی + خودکار — دونوں میں سے تازہ)
  const backupP = (async (): Promise<{
    manualAt: string | null;
    autoAt: string | null;
  }> => {
    if (!mine) return { manualAt: null, autoAt: null };
    try {
      const [manualRes, autoRes] = await Promise.all([
        supabase
          .from("backup_log")
          .select("downloaded_at")
          .order("downloaded_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.storage.from("backups").list(mine.madrasaId, {
          limit: 1,
          sortBy: { column: "name", order: "desc" },
        }),
      ]);
      const manualAt =
        (manualRes.data?.downloaded_at as string | undefined) ?? null;
      let autoAt: string | null = null;
      const latestAutoName = (autoRes.data ?? [])[0]?.name as
        | string
        | undefined;
      const autoMatch = latestAutoName
        ? /^auto-(\d{4})-(\d{2})-(\d{2})\.json$/.exec(latestAutoName)
        : null;
      if (autoMatch) {
        autoAt = `${autoMatch[1]}-${autoMatch[2]}-${autoMatch[3]}T00:00:00Z`;
      }
      return { manualAt, autoAt };
    } catch {
      return { manualAt: null, autoAt: null };
    }
  })();

  // بند شعبے — صرف عام صارف کے لیے (ایڈمن کو سب کچھ نظر آتا ہے؛
  // ایڈمن کے لیے پوچھنا بھی اس کے اپنے بند شعبے نہیں دیتا، اس لیے
  // جواب بعد میں پھینک دیا جاتا ہے)
  const deniedP = (async (): Promise<string[]> => {
    if (!mine) return [];
    try {
      const { data: denied } = await supabase
        .from("user_permissions")
        .select("module")
        .eq("allowed", false);
      return ((denied ?? []) as { module: string }[]).map((d) => d.module);
    } catch {
      return [];
    }
  })();

  // مرحلہ 32 — گھنٹی کے لیے تازہ فعال اطلاعات (زیادہ سے زیادہ 5)
  const noticesP = (async (): Promise<
    { id: string; title: string; kind: string; notice_date: string }[]
  > => {
    if (!mine) return [];
    try {
      const { data: noticeRows } = await supabase
        .from("notices")
        .select("id, title, kind, notice_date")
        .eq("status", "active")
        .order("notice_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      return ((noticeRows ?? []) as {
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
    } catch {
      return [];
    }
  })();

  const noticesCountP = (async () => {
    if (!mine) return 0;
    try {
      const { count: noticeCount } = await supabase
        .from("notices")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      return noticeCount ?? 0;
    } catch {
      return 0;
    }
  })();

  // --- سب سوال ایک ساتھ پوچھے جاتے ہیں، جواب یہاں ملتا ہے ---
  const [
    counts,
    attendanceRaw,
    madrasaName,
    madrasaAddress,
    madrasaLogoUrl,
    myProfile,
    isOwner,
    backupDates,
    deniedRows,
    recentNotices,
    activeNoticesCount,
  ] = await Promise.all([
    countsP,
    attendanceP,
    madrasaNameP,
    madrasaAddressP,
    madrasaLogoUrlP,
    myProfileP,
    isOwnerP,
    backupP,
    deniedP,
    noticesP,
    noticesCountP,
  ]);

  // مرحلہ 97 — گنتیاں: RPC سے ملیں تو وہی، ورنہ پرانا رستہ (9 سوال)۔
  // دونوں کا جواب ایک جیسا ہے — عدد بالکل ویسے ہی رہیں گے۔
  let totalStudents = 0;
  let totalTeachers = 0;
  let classesCountRaw = 0;
  let studentsBaninRaw = 0;
  let studentsBanatRaw = 0;
  let teachersBaninRaw = 0;
  let teachersBanatRaw = 0;
  let classesBaninRaw = 0;
  let classesBanatRaw = 0;
  if (counts) {
    totalStudents = counts.students.total;
    totalTeachers = counts.teachers.total;
    classesCountRaw = counts.classes.total;
    studentsBaninRaw = counts.students.banin;
    studentsBanatRaw = counts.students.banat;
    teachersBaninRaw = counts.teachers.banin;
    teachersBanatRaw = counts.teachers.banat;
    classesBaninRaw = counts.classes.banin;
    classesBanatRaw = counts.classes.banat;
  } else {
    const legacy = await legacyCounts();
    totalStudents = legacy.totalStudents;
    totalTeachers = legacy.totalTeachers;
    classesCountRaw = legacy.classesCountRaw;
    studentsBaninRaw = legacy.studentsBaninRaw;
    studentsBanatRaw = legacy.studentsBanatRaw;
    teachersBaninRaw = legacy.teachersBaninRaw;
    teachersBanatRaw = legacy.teachersBanatRaw;
    classesBaninRaw = legacy.classesBaninRaw;
    classesBanatRaw = legacy.classesBanatRaw;
  }

  const studentsBanin = allowedSections.has("banin") ? studentsBaninRaw : 0;
  const studentsBanat = allowedSections.has("banat") ? studentsBanatRaw : 0;
  const teachersBanin = allowedSections.has("banin") ? teachersBaninRaw : 0;
  const teachersBanat = allowedSections.has("banat") ? teachersBanatRaw : 0;
  const classesBanin = allowedSections.has("banin") ? classesBaninRaw : 0;
  const classesBanat = allowedSections.has("banat") ? classesBanatRaw : 0;

  const attendanceToday: {
    present: number;
    total: number;
    marked: number;
  } | null = attendanceRaw
    ? {
        present: attendanceRaw.present,
        total: totalStudents,
        marked: attendanceRaw.marked,
      }
    : null;

  // مرحلہ 25/67 — صارف کا نام/کردار، مہمان کا باقی وقت
  const userName = myProfile?.name ?? null;
  const userRole = myProfile?.role
    ? (ROLE_LABELS[myProfile.role as MadrasaRole] ?? null)
    : null;
  const isAdmin = myProfile?.role === "super_admin";
  let guestRemainingText: string | null = null;
  if (myProfile?.guest_expires_at) {
    const ms =
      new Date(myProfile.guest_expires_at).getTime() - Date.now();
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

  // مرحلہ 80/84 — بیک اپ کی یاددہانی (مہمان کو نہیں — اس کا ڈیٹا نمونہ
  // ہے؛ حصہ 4 — صرف مالک کو، عملے کو بیک اپ کا لنک دکھانا ہی نہیں)
  let backupReminderText: string | null = null;
  if (!myProfile?.guest_expires_at && (isAdmin || isOwner)) {
    const lastAt =
      [backupDates.manualAt, backupDates.autoAt]
        .filter((d): d is string => d !== null)
        .sort()
        .pop() ?? null;
    if (!lastAt) {
      backupReminderText =
        "ابھی تک بیک اپ ڈاؤن لوڈ نہیں ہوا — ڈیٹا محفوظ رکھنے کے لیے بیک اپ ڈاؤن لوڈ کر لیں۔";
    } else {
      const days = Math.floor(
        (Date.now() - new Date(lastAt).getTime()) / (24 * 60 * 60 * 1000),
      );
      if (days > 30) {
        backupReminderText = `آخری بیک اپ کو ${days.toLocaleString("ur-PK")} دن ہو گئے ہیں — نیا بیک اپ ڈاؤن لوڈ کر لیں۔`;
      }
    }
  }

  // بند شعبے — صرف عام صارف کے لیے
  const deniedModules: string[] = isAdmin ? [] : deniedRows;

  return (
    <>
      <TopBar
        madrasaName={madrasaName}
        madrasaLogoUrl={madrasaLogoUrl}
        isAdmin={isAdmin || isOwner}
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
      {/* حصہ 4 — کارڈ صرف کھلے گروپ کے حساب سے */}
      <StatsRow
        studentsCount={totalStudents}
        teachersCount={totalTeachers}
        classesCount={classesCountRaw}
        studentsBanin={studentsBanin}
        studentsBanat={studentsBanat}
        teachersBanin={teachersBanin}
        teachersBanat={teachersBanat}
        classesBanin={classesBanin}
        classesBanat={classesBanat}
        attendanceToday={attendanceToday}
        showStudents={!deniedModules.includes("students")}
        showTeachers={!deniedModules.includes("teachers")}
        showClasses={!deniedModules.includes("classes")}
        showAttendance={
          !deniedModules.includes("att-students") ||
          !deniedModules.includes("att-teachers")
        }
      />
      {/* حصہ 4 کی درستگی — مالک کو بھی صارفین/تنخواہوں کے بٹن دکھیں */}
      <DepartmentGroups
        isAdmin={isAdmin || isOwner}
        deniedModules={deniedModules}
      />
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
