/**
 * مرحلہ 10 — امتحان کی تفصیل: نمبر درج کرنا + نتائج (خودکار حساب)
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا امتحان کھل سکتا ہے۔
 * طالبات اسی شعبے کی فعال طالبات ہیں (جماعت لکھی ہو تو وہی جماعت)۔
 */
import BackButton from "@/components/BackButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_LABELS,
  SECTION_LABELS,
  type Student,
} from "@/lib/students";
import {
  summarizeExamResults,
  type Exam,
  type ExamResult,
} from "@/lib/exams";
import MarksForm from "@/app/departments/exams/MarksForm";
import PrintButton from "@/components/PrintButton";
import { saveMarks } from "@/app/departments/exams/actions";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: examData, error: examError } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();

  if (examError || !examData) {
    notFound();
  }

  const exam = examData as Exam;
  // مرحلہ 61 — پرنٹ والی شیٹ کے سرنامے کے لیے مدرسے کا نام
  const { data: madrasaData } = await supabase
    .from("madrasas")
    .select("name")
    .eq("id", exam.madrasa_id)
    .single();
  const madrasaName =
    (madrasaData as { name: string } | null)?.name ??
    "مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات";
  // مرحلہ 54 — بند شعبے کا امتحان نہیں کھلے گا (پرانا امتحان ہو تو
  // شعبہ خالی ہو سکتا ہے — اس صورت میں یہ جانچ نہیں لگتی)
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section)) notFound();
  const subjects = exam.subjects ?? [];
  const totalPossible = subjects.length * 100;

  // اس امتحان کی طالبات
  let studentQuery = supabase
    .from("students")
    .select("id, name, father_name, registration_number, class_name")
    .eq("madrasa_id", exam.madrasa_id)
    .eq("department", exam.department)
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  if (exam.class_name) {
    studentQuery = studentQuery.eq("class_name", exam.class_name);
  }
  const { data: studentData } = await studentQuery;
  const students = (studentData ?? []) as Pick<
    Student,
    "id" | "name" | "father_name" | "registration_number" | "class_name"
  >[];

  // درج شدہ نمبر
  const { data: resultData } = await supabase
    .from("exam_results")
    .select("*")
    .eq("madrasa_id", exam.madrasa_id)
    .eq("exam_id", exam.id);
  const results = (resultData ?? []) as ExamResult[];

  // خانوں میں پہلے سے درج نمبر بھرنے کے لیے
  const existing: Record<string, Record<number, number>> = {};
  for (const r of results) {
    const idx = subjects.indexOf(r.subject);
    if (idx < 0) continue;
    if (!existing[r.student_id]) existing[r.student_id] = {};
    existing[r.student_id][idx] = r.marks_obtained;
  }

  const summaries = summarizeExamResults(
    students.map((s) => s.id),
    results,
    totalPossible,
  );
  const rankedStudents = students
    .filter((s) => summaries.has(s.id))
    .sort(
      (a, b) =>
        (summaries.get(a.id)?.position ?? 999) -
        (summaries.get(b.id)?.position ?? 999),
    );

  // مرحلہ 61 — درجہ وار: امتحان کسی ایک جماعت کا ہو تو وہی جماعت؛
  // پورے شعبے کا ہو تو ہر جماعت الگ حصے میں (پرنٹ کے لیے)
  const groupedResults =
    exam.class_name
      ? [{ className: exam.class_name, students: rankedStudents }]
      : [
          ...new Set(
            rankedStudents.map((s) => s.class_name || "دیگر"),
          ),
        ].map((className) => ({
          className,
          students: rankedStudents.filter(
            (s) => (s.class_name || "دیگر") === className,
          ),
        }));

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/exams" />
          <h2>{exam.name}</h2>
          <span className="page-count">
            {DEPARTMENT_LABELS[exam.department]}
            {exam.section ? ` — ${SECTION_LABELS[exam.section]}` : ""}
            {exam.class_name ? ` — ${exam.class_name}` : ""}
          </span>
          <span className="spacer" />
          <span className="no-print">
            <PrintButton />
          </span>
        </div>

        {/* مرحلہ 61 — پرنٹ والی شیٹ کا سرنامہ (صرف پرنٹ میں دکھتا ہے) */}
        <div className="print-only print-sheet-head">
          <h2>{madrasaName}</h2>
          <p>
            {exam.name} — {DEPARTMENT_LABELS[exam.department]}
            {exam.section ? ` — ${SECTION_LABELS[exam.section]}` : ""}
            {exam.class_name ? ` — ${exam.class_name}` : ""}
          </p>
          <p>
            تاریخ: {formatDate(exam.exam_date)} — کل نمبر:{" "}
            {totalPossible.toLocaleString("ur-PK")}
          </p>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>امتحان کی تاریخ</span>
            <span>{formatDate(exam.exam_date)}</span>
          </div>
          <div className="row">
            <span>مضامین</span>
            <span>{subjects.join("، ") || "—"}</span>
          </div>
          <div className="row">
            <span>کل نمبر</span>
            <span>{totalPossible.toLocaleString("ur-PK")}</span>
          </div>
          <div className="row">
            <span>نتائج درج</span>
            <span>
              {summaries.size.toLocaleString("ur-PK")} طالبات کے
            </span>
          </div>
        </div>

        {/* مرحلہ 61 — نمبر درج کرنے والا فارم پرنٹ میں نہیں دکھتا */}
        <div className="no-print">
          {students.length === 0 ? (
            <p className="empty-state">
              اس شعبے/جماعت میں کوئی فعال طالبہ نہیں ہے — پہلے طالبہ شامل کریں۔
            </p>
          ) : (
            <>
              <h3 className="form-section-title">نمبر درج کریں</h3>
              <MarksForm
                examId={exam.id}
                students={students}
                subjects={subjects}
                existing={existing}
                action={saveMarks}
              />
            </>
          )}
        </div>

        {rankedStudents.length > 0 ? (
          <>
            <h3 className="form-section-title">نتائج</h3>
            {groupedResults.map((group) => (
              <div key={group.className}>
                {groupedResults.length > 1 ? (
                  <h4 className="form-section-title">{group.className}</h4>
                ) : null}
                <div className="tbl-wrap">
                  <table className="tbl exam-print">
                    <thead>
                      <tr>
                        <th>پوزیشن</th>
                        <th>نام</th>
                        {subjects.map((s) => (
                          <th key={s}>{s}</th>
                        ))}
                        <th>کل نمبر</th>
                        <th>فیصد</th>
                        <th>درجہ</th>
                        <th className="no-print">نتیجہ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.students.map((s) => {
                        const sum = summaries.get(s.id);
                        if (!sum) return null;
                        return (
                          <tr key={s.id}>
                            <td>
                              {sum.position?.toLocaleString("ur-PK") ?? "—"}
                            </td>
                            <td>
                              {s.name}
                              <br />
                              <span className="sub">{s.father_name}</span>
                            </td>
                            {subjects.map((_, idx) => {
                              const m = existing[s.id]?.[idx];
                              return (
                                <td key={idx}>
                                  {m === undefined
                                    ? "—"
                                    : m.toLocaleString("ur-PK")}
                                </td>
                              );
                            })}
                            <td>
                              {sum.totalObtained.toLocaleString("ur-PK")}
                              /{" "}
                              {sum.totalPossible.toLocaleString("ur-PK")}
                            </td>
                            <td>{sum.percentage.toFixed(1)}%</td>
                            <td>{sum.grade}</td>
                            <td className="no-print">
                              <Link
                                href={`/departments/exams/${exam.id}/result/${s.id}`}
                              >
                                دیکھیں
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
