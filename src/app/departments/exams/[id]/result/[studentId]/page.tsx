/**
 * مرحلہ 64 — ایک طالبہ/طالب کا انفرادی نتیجہ کارڈ
 * مرحلہ 65 — کارڈ کی نئی شکل: رسمی کارڈ (وفاق کے انفرادی نتیجے
 * کی ترتیب سے متاثر — وفاق کا نام/لوگو نہیں، ہمارا اپنا مدرسے کا
 * نام اور ہماری اپنی کتاب والی علامت)۔ ڈبل ڈبہ، خانے، نمبروں کی
 * جدول، کل/فیصد/مجموعہ کی پٹی، تقدیر، دستخط مہتمم اور جاری کردہ۔
 * نمبر اور پوزیشن وہی ہیں جو امتحان کی تفصیل والی جدول میں ہیں۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  DEPARTMENT_LABELS,
  SECTION_LABELS,
  type SectionId,
  type Student,
} from "@/lib/students";
import {
  examTypeSectionLabel,
  summarizeExamResults,
  type Exam,
  type ExamResult,
} from "@/lib/exams";
import { gregorianToHijri } from "@/lib/hijri";
import { LOGO_SVG } from "@/components/icons";
import PrintButton from "@/components/PrintButton";
import ResultCardImageButton, {
  type ResultCardImageData,
} from "@/components/ResultCardImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

/** امتحان کی تاریخ سے ہجری سال — "YYYY-MM-DD" سے سیدھا حصے لے کر */
function hijriYearOf(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return gregorianToHijri(y, m, d).year;
}

export default async function ExamResultPage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id, studentId } = await params;
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

  // مرحلہ 54 — بند شعبے کا امتحان نہیں کھلے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section)) notFound();

  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select(
      "id, name, father_name, registration_number, class_name, department, section, date_of_birth",
    )
    .eq("id", studentId)
    .eq("madrasa_id", exam.madrasa_id)
    .single();
  if (studentError || !studentData) {
    notFound();
  }
  const student = studentData as Pick<
    Student,
    | "id"
    | "name"
    | "father_name"
    | "registration_number"
    | "class_name"
    | "department"
    | "section"
    | "date_of_birth"
  >;
  // مرحلہ 64 — بند شعبے کی طالبہ کا نتیجہ نہیں کھلے گا
  if (!allowedSections.has((student.section ?? "banat") as SectionId)) {
    notFound();
  }
  // یہ طالبہ اسی شعبے/جماعت کی ہونی چاہیے جس کا امتحان ہے
  if (student.department !== exam.department) notFound();
  if (exam.class_name && student.class_name !== exam.class_name) {
    notFound();
  }

  const subjects = exam.subjects ?? [];
  const totalPossible = subjects.length * 100;

  // پوزیشن کے لیے اس امتحان کی سب طالبات (تفصیل والے صفحے جیسا)
  let studentQuery = supabase
    .from("students")
    .select("id")
    .eq("madrasa_id", exam.madrasa_id)
    .eq("department", exam.department)
    .eq("status", "active");
  if (exam.class_name) {
    studentQuery = studentQuery.eq("class_name", exam.class_name);
  }
  const { data: allStudentData } = await studentQuery;
  const studentIds = ((allStudentData ?? []) as { id: string }[]).map(
    (s) => s.id,
  );

  const { data: resultData } = await supabase
    .from("exam_results")
    .select("*")
    .eq("madrasa_id", exam.madrasa_id)
    .eq("exam_id", exam.id);
  const results = (resultData ?? []) as ExamResult[];

  const summaries = summarizeExamResults(studentIds, results, totalPossible);
  const mine = summaries.get(studentId);

  // مدرسے کا نام (تفصیل والے صفحے جیسا)
  const { data: madrasaData } = await supabase
    .from("madrasas")
    .select("name")
    .eq("id", exam.madrasa_id)
    .single();
  const madrasaName =
    (madrasaData as { name: string } | null)?.name ??
    "مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات";

  if (!mine) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href={`/departments/exams/${exam.id}`} />
            <h2>امتحان کا نتیجہ</h2>
          </div>
          <p className="empty-state">
            {student.name} کے اس امتحان میں ابھی نمبر درج نہیں ہیں۔
          </p>
        </div>
      </div>
    );
  }

  // اس طالبہ کے ہر مضمون کے نمبر
  const marksBySubject: Record<number, number> = {};
  for (const r of results) {
    if (r.student_id !== studentId) continue;
    const idx = subjects.indexOf(r.subject);
    if (idx < 0) continue;
    marksBySubject[idx] = r.marks_obtained;
  }

  const sectionLabel =
    SECTION_LABELS[(exam.section ?? "banat") as SectionId];
  const hijriYear = hijriYearOf(exam.exam_date);
  const gregorianYear = exam.exam_date
    ? Number(exam.exam_date.split("-")[0])
    : null;
  const yearLine =
    hijriYear && gregorianYear
      ? `سال ${hijriYear.toLocaleString("ur-PK")}ھ بمطابق ${gregorianYear.toLocaleString("ur-PK")}ء`
      : gregorianYear
        ? `سال ${gregorianYear.toLocaleString("ur-PK")}ء`
        : "—";
  const dobText = student.date_of_birth
    ? formatDate(student.date_of_birth)
    : "—";
  const classLabel = exam.class_name ?? "پورا شعبہ";

  const subjectRows = subjects.map((s, idx) => ({
    serial: (idx + 1).toLocaleString("ur-PK"),
    name: s,
    marks:
      marksBySubject[idx] === undefined
        ? "—"
        : marksBySubject[idx].toLocaleString("ur-PK"),
  }));

  const imageData: ResultCardImageData = {
    madrasaName,
    examName: exam.name,
    sectionLabel,
    typeSectionLabel: examTypeSectionLabel(exam.exam_type, sectionLabel),
    yearLine,
    registrationNumber: student.registration_number,
    studentName: student.name,
    fatherName: student.father_name,
    dateOfBirth: dobText,
    classLabel,
    departmentLabel: DEPARTMENT_LABELS[exam.department],
    examDate: formatDate(exam.exam_date),
    subjects: subjectRows.map(
      (r) => [r.name, r.marks] as [string, string],
    ),
    totalPossible: totalPossible.toLocaleString("ur-PK"),
    percentage: `${mine.percentage.toFixed(1)}%`,
    obtained: mine.totalObtained.toLocaleString("ur-PK"),
    grade: mine.grade,
    filename: `result-${student.registration_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card result-card-page">
        <div className="page-head">
          <BackButton href={`/departments/exams/${exam.id}`} />
          <h2>امتحان کا نتیجہ</h2>
          <span className="page-count">{student.registration_number}</span>
        </div>

        <div className="result-card">
          <div className="result-card-inner">
            <div className="result-emblem" aria-hidden="true">
              <span dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
            </div>
            <div className="result-head-box">{madrasaName}</div>
            <p className="result-exam">
              امتحان — {exam.name} (
              {examTypeSectionLabel(exam.exam_type, sectionLabel)})
            </p>
            <p className="result-year">{yearLine}</p>

            <div className="result-fields">
              <div className="result-field full">
                <span className="fl">نام</span>
                <span className="fv">{student.name}</span>
              </div>
              <div className="result-field full">
                <span className="fl">ولدیت</span>
                <span className="fv">{student.father_name}</span>
              </div>
              <div className="result-field">
                <span className="fl">رجسٹریشن نمبر</span>
                <span className="fv">{student.registration_number}</span>
              </div>
              <div className="result-field">
                <span className="fl">جماعت</span>
                <span className="fv">{classLabel}</span>
              </div>
              <div className="result-field">
                <span className="fl">تاریخ پیدائش</span>
                <span className="fv">{dobText}</span>
              </div>
              <div className="result-field">
                <span className="fl">تاریخ امتحان</span>
                <span className="fv">{formatDate(exam.exam_date)}</span>
              </div>
              <div className="result-field full">
                <span className="fl">شعبہ</span>
                <span className="fv">
                  {DEPARTMENT_LABELS[exam.department]} — {sectionLabel}
                </span>
              </div>
            </div>

            <h3 className="result-title">حاصل کردہ نمبرات کی تفصیل</h3>
            <table className="result-marks">
              <thead>
                <tr>
                  <th>رقم مسلسل</th>
                  <th>کتاب</th>
                  <th>نمبر</th>
                </tr>
              </thead>
              <tbody>
                {subjectRows.map((r) => (
                  <tr key={r.serial}>
                    <td>{r.serial}</td>
                    <td>{r.name}</td>
                    <td>{r.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="result-totals">
              <span>کل نمبر {totalPossible.toLocaleString("ur-PK")}</span>
              <span>فیصد نمبر {mine.percentage.toFixed(1)}%</span>
              <span>
                مجموعہ نمبرات {mine.totalObtained.toLocaleString("ur-PK")}
              </span>
            </div>
            <p className="result-grade">تقدیر — {mine.grade}</p>

            <div className="result-signs">
              <div className="result-sign">
                <div className="line" />
                <span>دستخط مہتمم</span>
              </div>
              <div className="result-sign">
                <div className="line" />
                <span>جاری کردہ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions no-print">
          <ResultCardImageButton data={imageData} />
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
