/**
 * مرحلہ 64 — ایک طالبہ/طالب کا انفرادی نتیجہ کارڈ
 * ہر کتاب کے نمبر + کل + فیصد + درجہ + پوزیشن — ایک چکور ڈبے
 * (رسید والی سلپ) میں۔ تصویر محفوظ کی جا سکتی ہے یا پرنٹ ہو سکتا
 * ہے تاکہ سرپرست کو بھیجا جا سکے۔
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
  summarizeExamResults,
  type Exam,
  type ExamResult,
} from "@/lib/exams";
import PrintButton from "@/components/PrintButton";
import SaveSlipImageButton, {
  type SlipImageData,
} from "@/components/SaveSlipImageButton";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
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
      "id, name, father_name, registration_number, class_name, department, section",
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

  // کارڈ کی قطاریں — اسکرین پر اور تصویر میں وہی قطاریں
  // (رجسٹریشن نمبر تصویر کی پٹی میں ہے، اس لیے قطاروں میں نہیں)
  const cardRows: [string, string][] = [
    ["نام", student.name],
    ["والد کا نام", student.father_name],
    ["امتحان", exam.name],
    ["تاریخ", formatDate(exam.exam_date)],
    [
      "شعبہ",
      `${DEPARTMENT_LABELS[exam.department]} — ${SECTION_LABELS[(exam.section ?? "banat") as SectionId]}`,
    ],
    ["جماعت", exam.class_name ?? "پورا شعبہ"],
    ...subjects.map(
      (s, idx) =>
        [
          s,
          marksBySubject[idx] === undefined
            ? "—"
            : `${marksBySubject[idx].toLocaleString("ur-PK")} / 100`,
        ] as [string, string],
    ),
    [
      "کل نمبر",
      `${mine.totalObtained.toLocaleString("ur-PK")} / ${mine.totalPossible.toLocaleString("ur-PK")}`,
    ],
    ["فیصد", `${mine.percentage.toFixed(1)}%`],
    ["درجہ", mine.grade],
    [
      "پوزیشن",
      mine.position === null ? "—" : mine.position.toLocaleString("ur-PK"),
    ],
  ];
  const imageData: SlipImageData = {
    madrasaName,
    title: "امتحان کا نتیجہ",
    numberLabel: "رجسٹریشن نمبر",
    numberValue: student.registration_number,
    rows: cardRows,
    filename: `result-${student.registration_number}.png`,
  };

  return (
    <div className="module-view open">
      <div className="page-card receipt receipt-slip">
        <div className="page-head">
          <BackButton href={`/departments/exams/${exam.id}`} />
          <h2>امتحان کا نتیجہ</h2>
          <span className="page-count">{student.registration_number}</span>
        </div>

        <div className="receipt-head">
          <strong>{madrasaName}</strong>
          <span>شادی لارج، ضلع بدین، سندھ</span>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>رجسٹریشن نمبر</span>
            <span>{student.registration_number}</span>
          </div>
          {cardRows.map(([label, value]) => (
            <div className="row" key={label}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>

        <div className="form-actions no-print">
          <SaveSlipImageButton data={imageData} />
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
