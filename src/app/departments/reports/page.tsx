/**
 * مرحلہ 29 — رپورٹس (سرور صفحہ، صرف دیکھنے کے لیے)
 * کوئی نئی میز نہیں، کوئی SQL نہیں — خلاصہ موجودہ ڈیٹا سے بنتا ہے:
 * طلبہ (شعبہ وار)، اساتذہ/عملہ، آج کی حاضری، امتحانات، اس مہینے کا مالی
 * خلاصہ، اطلاعات اور دستاویزات۔ زکوٰۃ الگ دکھائی جاتی ہے — کبھی بیلنس
 * میں نہیں گنی جاتی۔ منسوخ ریکارڈ خلاصے میں نہیں گنے جاتے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import PrintButton from "@/components/PrintButton";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  getMySectionFilter,
} from "@/lib/permissions";
import { todayInKarachi } from "@/lib/attendance";
import {
  currentMonthInKarachi,
  formatMonthUrdu,
} from "@/lib/fees";
import {
  DEPARTMENT_IDS,
  DEPARTMENT_LABELS,
  SECTION_IDS,
  SECTION_LABELS,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";

/** "2026-11" کا اگلا مہینہ — "2026-12-01" */
function nextMonthStart(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return d.toISOString().slice(0, 7) + "-01";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

function money(value: number): string {
  return `${value.toLocaleString("ur-PK")} روپے`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const supabase = await createClient();
  // مرحلہ 55 — چنا ہوا شعبہ (بنین / بنات / سب)
  const allowedSections = await getMyAllowedSections(supabase);
  const sp = await searchParams;
  const section = getMySectionFilter(allowedSections, sp.section);
  const effectiveSections =
    section === "all" ? allowedSections : new Set<SectionId>([section]);
  const today = todayInKarachi();
  const month = currentMonthInKarachi();
  const monthStart = `${month}-01`;
  const monthEnd = nextMonthStart(month);

  // مرحلہ 93 — 13 سوال ایک ساتھ (پہلے ایک کے بعد ایک پوچھے جاتے تھے —
  // اسی لیے یہ صفحہ سست تھا)۔ حساب، فلٹر اور غلطی کی جانچ ویسے ہی ہیں۔
  const [
    { data: studentsData, error: studentsError },
    { data: teachersData, error: teachersError },
    { data: staffData, error: staffError },
    { data: attStudentsData, error: attStudentsError },
    { data: attTeachersData, error: attTeachersError },
    { data: examsData, error: examsError },
    { data: resultsData, error: resultsError },
    { data: feesData, error: feesError },
    { data: donationsData, error: donationsError },
    { data: expensesData, error: expensesError },
    { data: zakatData, error: zakatError },
    { data: noticesData, error: noticesError },
    { data: documentsData, error: documentsError },
  ] = await Promise.all([
    supabase.from("students").select("department, status, section"),
    supabase.from("teachers").select("status, section"),
    supabase.from("staff").select("status, section"),
    supabase
      .from("student_attendance")
      .select("status, students(section)")
      .eq("date", today),
    supabase
      .from("teacher_attendance")
      .select("status, teachers(section)")
      .eq("date", today),
    supabase
      .from("exams")
      .select("id, name, exam_date, section")
      .order("exam_date", { ascending: false }),
    supabase
      .from("exam_results")
      .select("exam_id, student_id, students(section)"),
    supabase
      .from("fee_payments")
      .select("amount, students(section)")
      .eq("fee_month", month)
      .eq("status", "active"),
    supabase
      .from("donations")
      .select("amount, section")
      .gte("donation_date", monthStart)
      .lt("donation_date", monthEnd)
      .eq("status", "active"),
    supabase
      .from("expenses")
      .select("amount, section")
      .gte("expense_date", monthStart)
      .lt("expense_date", monthEnd)
      .eq("status", "active"),
    supabase
      .from("zakat_records")
      .select("kind, amount, section")
      .gte("record_date", monthStart)
      .lt("record_date", monthEnd)
      .eq("status", "active"),
    supabase.from("notices").select("status"),
    supabase.from("documents").select("status, expiry_date"),
  ]);

  // طلبہ — شعبہ وار + حالت
  const students = ((studentsData ?? []) as {
    department: DepartmentId;
    status: string;
    section: string;
  }[]).filter((s) =>
    effectiveSections.has((s.section ?? "banat") as SectionId),
  );
  const studentsActive = students.filter((s) => s.status === "active");
  const studentsWithdrawn = students.filter((s) => s.status === "withdrawn");

  // اساتذہ اور عملہ
  const teachers = ((teachersData ?? []) as {
    status: string;
    section: string;
  }[]).filter((t) =>
    effectiveSections.has((t.section ?? "banat") as SectionId),
  );
  const staff = ((staffData ?? []) as {
    status: string;
    section: string;
  }[]).filter((m) =>
    effectiveSections.has((m.section ?? "banat") as SectionId),
  );

  // آج کی حاضری — طلبہ + اساتذہ
  const attStudents = ((attStudentsData ?? []) as unknown as {
    status: string;
    students: { section: string } | null;
  }[]).filter((r) =>
    effectiveSections.has((r.students?.section ?? "banat") as SectionId),
  );
  const attTeachers = ((attTeachersData ?? []) as unknown as {
    status: string;
    teachers: { section: string } | null;
  }[]).filter((r) =>
    effectiveSections.has((r.teachers?.section ?? "banat") as SectionId),
  );

  // امتحانات — ہر امتحان کے شرکاء
  const exams = ((examsData ?? []) as {
    id: string;
    name: string;
    exam_date: string;
    section: string;
  }[]).filter((e) =>
    effectiveSections.has((e.section ?? "banat") as SectionId),
  );
  const results = ((resultsData ?? []) as unknown as {
    exam_id: string;
    student_id: string;
    students: { section: string } | null;
  }[]).filter((r) =>
    effectiveSections.has((r.students?.section ?? "banat") as SectionId),
  );

  // اس مہینے کا مالی خلاصہ
  const fees = ((feesData ?? []) as unknown as {
    amount: number;
    students: { section: string } | null;
  }[]).filter((f) =>
    effectiveSections.has((f.students?.section ?? "banat") as SectionId),
  );
  // مرحلہ 62 — عطیات بھی چنے ہوئے شعبے کے
  const donations = ((donationsData ?? []) as {
    amount: number;
    section: string;
  }[]).filter((d) =>
    effectiveSections.has((d.section ?? "banat") as SectionId),
  );
  // مرحلہ 62 — اخراجات بھی چنے ہوئے شعبے کے
  const expenses = ((expensesData ?? []) as {
    amount: number;
    section: string;
  }[]).filter((e) =>
    effectiveSections.has((e.section ?? "banat") as SectionId),
  );
  // مرحلہ 62 — زکوٰۃ بھی چنے ہوئے شعبے کی
  const zakat = ((zakatData ?? []) as {
    kind: string;
    amount: number;
    section: string;
  }[]).filter((r) =>
    effectiveSections.has((r.section ?? "banat") as SectionId),
  );

  // اطلاعات اور دستاویزات
  const notices = (noticesData ?? []) as { status: string }[];
  const documents = (documentsData ?? []) as {
    status: string;
    expiry_date: string | null;
  }[];

  const tableMissing = [
    studentsError,
    teachersError,
    staffError,
    attStudentsError,
    attTeachersError,
    examsError,
    resultsError,
    feesError,
    donationsError,
    expensesError,
    zakatError,
    noticesError,
    documentsError,
  ].some((e) => (e as { code?: string } | null)?.code === "42P01");

  const countStatus = (rows: { status: string }[], status: string) =>
    rows.filter((r) => r.status === status).length;

  const feesTotal = fees.reduce((a, r) => a + r.amount, 0);
  const donationsTotal = donations.reduce((a, r) => a + r.amount, 0);
  const expensesTotal = expenses.reduce((a, r) => a + r.amount, 0);
  const zakatReceived = zakat
    .filter((r) => r.kind === "received")
    .reduce((a, r) => a + r.amount, 0);
  const zakatDistributed = zakat
    .filter((r) => r.kind === "distributed")
    .reduce((a, r) => a + r.amount, 0);
  const expiredDocs = documents.filter(
    (d) =>
      d.status === "active" && d.expiry_date && d.expiry_date < today,
  ).length;

  const participantsByExam = new Map<string, Set<string>>();
  for (const r of results) {
    if (!participantsByExam.has(r.exam_id)) {
      participantsByExam.set(r.exam_id, new Set());
    }
    participantsByExam.get(r.exam_id)!.add(r.student_id);
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>رپورٹس</h2>
          <PrintButton />
        </div>

        <form className="att-controls" method="get">
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

        <p className="sub">
          شعبہ چنیں تو طلبہ، اساتذہ، عملہ، حاضری، امتحانات اور فیس اسی
          شعبے کے حساب سے دکھائے جاتے ہیں۔ عطیات، اخراجات، زکوٰۃ،
          اطلاعات اور دستاویزات کا شعبہ نہیں ہوتا — وہ پورے دکھائے
          جاتے ہیں۔
        </p>

        {tableMissing ? (
          <p className="empty-state">
            کوئی میز ابھی نہیں بنی — پہلے متعلقہ مرحلے کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <p className="sub">
              آج کی تاریخ: {formatDate(today)} — مالی خلاصہ اس مہینے کا ہے:{" "}
              {formatMonthUrdu(month)}
            </p>

            <h3 className="form-section-title">طلبہ</h3>
            <div className="detail-rows">
              <div className="row">
                <span>کل فعال طلبہ</span>
                <strong>{studentsActive.length}</strong>
              </div>
              <div className="row">
                <span>خارج شدہ طلبہ</span>
                <strong>{studentsWithdrawn.length}</strong>
              </div>
              {DEPARTMENT_IDS.map(
                (dept) => (
                  <div className="row" key={dept}>
                    <span>{DEPARTMENT_LABELS[dept]} (فعال)</span>
                    <strong>
                      {
                        studentsActive.filter((s) => s.department === dept)
                          .length
                      }
                    </strong>
                  </div>
                ),
              )}
            </div>

            <h3 className="form-section-title">اساتذہ اور عملہ</h3>
            <div className="detail-rows">
              <div className="row">
                <span>کل فعال اساتذہ</span>
                <strong>{countStatus(teachers, "active")}</strong>
              </div>
              <div className="row">
                <span>کل فعال عملہ</span>
                <strong>{countStatus(staff, "active")}</strong>
              </div>
            </div>

            <h3 className="form-section-title">آج کی حاضری</h3>
            <div className="detail-rows">
              <div className="row">
                <span>طلبہ — حاضر</span>
                <strong>{countStatus(attStudents, "present")}</strong>
              </div>
              <div className="row">
                <span>طلبہ — غیر حاضر</span>
                <strong>{countStatus(attStudents, "absent")}</strong>
              </div>
              <div className="row">
                <span>طلبہ — رخصت</span>
                <strong>{countStatus(attStudents, "leave")}</strong>
              </div>
              <div className="row">
                <span>طلبہ — مریض</span>
                <strong>{countStatus(attStudents, "sick")}</strong>
              </div>
              <div className="row">
                <span>اساتذہ — حاضر</span>
                <strong>{countStatus(attTeachers, "present")}</strong>
              </div>
              <div className="row">
                <span>اساتذہ — غیر حاضر</span>
                <strong>{countStatus(attTeachers, "absent")}</strong>
              </div>
            </div>

            <h3 className="form-section-title">امتحانات</h3>
            {exams.length === 0 ? (
              <p className="empty-state">ابھی کوئی امتحان درج نہیں ہے۔</p>
            ) : (
              <div className="detail-rows">
                {exams.map((exam) => (
                  <div className="row" key={exam.id}>
                    <span>
                      {exam.name} — {formatDate(exam.exam_date)}
                    </span>
                    <strong>
                      {participantsByExam.get(exam.id)?.size ?? 0} شرکاء
                    </strong>
                  </div>
                ))}
              </div>
            )}

            <h3 className="form-section-title">
              اس مہینے کا مالی خلاصہ ({formatMonthUrdu(month)})
            </h3>
            <div className="detail-rows">
              <div className="row">
                <span>فیس</span>
                <strong>{money(feesTotal)}</strong>
              </div>
              <div className="row">
                <span>عطیات</span>
                <strong>{money(donationsTotal)}</strong>
              </div>
              <div className="row">
                <span>کل آمدنی</span>
                <strong>{money(feesTotal + donationsTotal)}</strong>
              </div>
              <div className="row">
                <span>اخراجات</span>
                <strong>{money(expensesTotal)}</strong>
              </div>
              <div className="row">
                <span>بیلنس</span>
                <strong>
                  {money(feesTotal + donationsTotal - expensesTotal)}
                </strong>
              </div>
              <div className="row">
                <span>زکوٰۃ — وصولی (الگ فنڈ)</span>
                <strong>{money(zakatReceived)}</strong>
              </div>
              <div className="row">
                <span>زکوٰۃ — تقسیم (الگ فنڈ)</span>
                <strong>{money(zakatDistributed)}</strong>
              </div>
              <div className="row">
                <span>زکوٰۃ — باقی (الگ فنڈ)</span>
                <strong>{money(zakatReceived - zakatDistributed)}</strong>
              </div>
            </div>

            <h3 className="form-section-title">اطلاعات اور دستاویزات</h3>
            <div className="detail-rows">
              <div className="row">
                <span>فعال اطلاعات</span>
                <strong>{countStatus(notices, "active")}</strong>
              </div>
              <div className="row">
                <span>کل دستاویزات</span>
                <strong>{documents.length}</strong>
              </div>
              <div className="row">
                <span>میعاد ختم والی دستاویزات</span>
                <strong>{expiredDocs}</strong>
              </div>
            </div>

            <div className="form-actions">
              <Link className="btn-ghost" href="/departments/fin-reports">
                مالیاتی رپورٹس
              </Link>
              <Link className="btn-ghost" href="/departments/monthly">
                ماہانہ حسابات
              </Link>
              <Link className="btn-ghost" href="/departments/yearly">
                سالانہ حسابات
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
