/**
 * مرحلہ 10 — امتحان کی تفصیل: نمبر درج کرنا + نتائج (خودکار حساب)
 * RLS یقین دلاتی ہے کہ صرف اپنے مدرسے کا امتحان کھل سکتا ہے۔
 * طالبات اسی شعبے کی فعال طالبات ہیں (جماعت لکھی ہو تو وہی جماعت)۔
 */
import BackButton from "@/components/BackButton";
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
  // مرحلہ 54 — بند شعبے کا امتحان نہیں کھلے گا (پرانا امتحان ہو تو
  // شعبہ خالی ہو سکتا ہے — اس صورت میں یہ جانچ نہیں لگتی)
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section)) notFound();
  const subjects = exam.subjects ?? [];
  const totalPossible = subjects.length * 100;

  // اس امتحان کی طالبات
  let studentQuery = supabase
    .from("students")
    .select("id, name, father_name, registration_number")
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
    "id" | "name" | "father_name" | "registration_number"
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

        {rankedStudents.length > 0 ? (
          <>
            <h3 className="form-section-title">نتائج</h3>
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>پوزیشن</th>
                    <th>نام</th>
                    <th>کل نمبر</th>
                    <th>فیصد</th>
                    <th>درجہ</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedStudents.map((s) => {
                    const sum = summaries.get(s.id);
                    if (!sum) return null;
                    return (
                      <tr key={s.id}>
                        <td>{sum.position?.toLocaleString("ur-PK") ?? "—"}</td>
                        <td>
                          {s.name}
                          <br />
                          <span className="sub">{s.father_name}</span>
                        </td>
                        <td>
                          {sum.totalObtained.toLocaleString("ur-PK")} /{" "}
                          {sum.totalPossible.toLocaleString("ur-PK")}
                        </td>
                        <td>{sum.percentage.toFixed(1)}%</td>
                        <td>{sum.grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
