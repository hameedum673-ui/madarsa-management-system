/**
 * مرحلہ 10 — امتحانات اور نتائج: قسمیں، درجے اور پوزیشن کا حساب
 * ہر مضمون 100 نمبر کا ہے۔ درجہ فیصد سے بنتا ہے؛ پوزیشن کل نمبروں سے
 * (برابر نمبر والوں کی پوزیشن ایک جیسی ہوتی ہے: 1، 2، 2، 4)۔
 */
import type { DepartmentId, SectionId } from "@/lib/students";
import type { createClient } from "@/lib/supabase/server";
import { getAllAcademicYears } from "./academicYears";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface Exam {
  id: string;
  madrasa_id: string;
  name: string;
  exam_date: string;
  department: DepartmentId;
  section: SectionId;
  exam_type: string | null;
  class_name: string | null;
  subjects: string[];
  /** مرحلہ 57 — تعلیمی سال (migration 057؛ تاریخ سے نکلتا ہے، خالی ہو سکتا ہے) */
  academic_year_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamResult {
  id: string;
  madrasa_id: string;
  exam_id: string;
  student_id: string;
  subject: string;
  marks_obtained: number;
  created_at: string;
  updated_at: string;
}

/** مرحلہ 70 — امتحان کی قسم */
export type ExamType = "quarterly" | "half_yearly" | "annual" | "other";
export const EXAM_TYPE_IDS: ExamType[] = [
  "quarterly",
  "half_yearly",
  "annual",
  "other",
];
export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  quarterly: "سہ ماہی",
  half_yearly: "شش ماہی",
  annual: "سالانہ",
  other: "دیگر",
};
/** قسم کا لیبل — خالی ہو تو "—" */
export function examTypeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return (EXAM_TYPE_LABELS as Record<string, string>)[value] ?? "—";
}
/** قسم + شعبہ — مثلاً "سہ ماہی — بنین" */
export function examTypeSectionLabel(
  examType: string | null | undefined,
  sectionLabel: string,
): string {
  const t = examTypeLabel(examType);
  return t === "—" ? sectionLabel : `${t} — ${sectionLabel}`;
}

/** فیصد سے درجہ — مدرسے کا نظام (مرحلہ 63) */
export function gradeForPercentage(pct: number): string {
  if (pct >= 80) return "ممتاز";
  if (pct >= 60) return "جید جدا";
  if (pct >= 50) return "جید";
  if (pct >= 40) return "مقبول";
  return "راسب";
}

export interface StudentExamSummary {
  studentId: string;
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  position: number | null;
}

/**
 * ہر طالبہ کا خلاصہ + پوزیشن — صرف وہ طالبات جن کے کم از کم ایک مضمون کے
 * نمبر درج ہیں، پوزیشن میں شامل ہوتی ہیں۔
 */
export function summarizeExamResults(
  studentIds: string[],
  results: ExamResult[],
  totalPossible: number,
): Map<string, StudentExamSummary> {
  const totals = new Map<string, number>();
  for (const r of results) {
    totals.set(r.student_id, (totals.get(r.student_id) ?? 0) + r.marks_obtained);
  }

  const summaries = new Map<string, StudentExamSummary>();
  for (const studentId of studentIds) {
    if (!totals.has(studentId)) continue;
    const totalObtained = totals.get(studentId) as number;
    const percentage =
      totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
    summaries.set(studentId, {
      studentId,
      totalObtained,
      totalPossible,
      percentage,
      grade: gradeForPercentage(percentage),
      position: null,
    });
  }

  // پوزیشن: کل نمبر زیادہ = پوزیشن بہتر؛ برابر والوں کی ایک جیسی
  const ranked = [...summaries.values()].sort(
    (a, b) => b.totalObtained - a.totalObtained,
  );
  let currentPosition = 0;
  let previousTotal: number | null = null;
  ranked.forEach((s, index) => {
    if (previousTotal === null || s.totalObtained !== previousTotal) {
      currentPosition = index + 1;
      previousTotal = s.totalObtained;
    }
    s.position = currentPosition;
  });

  return summaries;
}

/**
 * طالبہ کی نتائج کی تاریخ (مرحلہ — پرانے نتائج والا صفحہ)
 * ایک طالبہ کے سب امتحان، تعلیمی سال کے حساب سے گروپ — ہر امتحان کا
 * خلاصہ (کل، فیصد، درجہ، پوزیشن) + ہر مضمون کے نمبر۔
 * پوزیشن کے لیے اس امتحان کے سب طلبہ کے نتائج چاہییں، اس لیے
 * allResults میں وہ سب آتے ہیں؛ myResults میں صرف اس طالبہ کے۔
 */
export interface HistoryExamMarks {
  subject: string;
  obtained: number;
}

export interface HistoryExamEntry {
  examId: string;
  name: string;
  examDate: string;
  className: string | null;
  examType: string | null;
  subjects: string[];
  academicYearId: string | null;
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  position: number | null;
  marks: HistoryExamMarks[];
}

export interface HistoryYearGroup {
  yearId: string | null;
  yearLabel: string;
  /** ترتیب کے لیے سال کی شروع کی تاریخ؛ بغیر سال والے گروپ کے لیے null (آخر میں) */
  yearStart: string | null;
  exams: HistoryExamEntry[];
}

/** خالص فعل — ڈیٹا بیس نہیں چھوتا، اس لیے الگ سے جانچا جا سکتا ہے */
export function groupHistoryExams(
  exams: Exam[],
  myResults: ExamResult[],
  allResults: ExamResult[],
  years: { id: string; label: string; start_date: string }[],
  studentId: string,
): HistoryYearGroup[] {
  const yearById = new Map(years.map((y) => [y.id, y]));
  const entries: HistoryExamEntry[] = [];

  const sortedExams = [...exams].sort((a, b) =>
    a.exam_date < b.exam_date ? 1 : a.exam_date > b.exam_date ? -1 : 0,
  );
  for (const exam of sortedExams) {
    const examResults = allResults.filter((r) => r.exam_id === exam.id);
    const studentIds = [...new Set(examResults.map((r) => r.student_id))];
    const summaries = summarizeExamResults(
      studentIds,
      examResults,
      exam.subjects.length * 100,
    );
    const mine = summaries.get(studentId);
    if (!mine) continue;
    // اس طالبہ کے نمبر — امتحان کے مضامین کی ترتیب میں؛ نامعلوم مضمون آخر میں
    const order = new Map(exam.subjects.map((s, i) => [s, i]));
    const marks = myResults
      .filter((r) => r.exam_id === exam.id)
      .sort(
        (a, b) =>
          (order.get(a.subject) ?? 999) - (order.get(b.subject) ?? 999),
      )
      .map((r) => ({ subject: r.subject, obtained: r.marks_obtained }));
    entries.push({
      examId: exam.id,
      name: exam.name,
      examDate: exam.exam_date,
      className: exam.class_name,
      examType: exam.exam_type,
      subjects: exam.subjects,
      academicYearId: exam.academic_year_id ?? null,
      totalObtained: mine.totalObtained,
      totalPossible: mine.totalPossible,
      percentage: mine.percentage,
      grade: mine.grade,
      position: mine.position,
      marks,
    });
  }

  // سال کے حساب سے گروپ؛ بغیر سال والا گروپ آخر میں
  const groups = new Map<string, HistoryYearGroup>();
  for (const entry of entries) {
    const key = entry.academicYearId ?? "__none__";
    let group = groups.get(key);
    if (!group) {
      const year = entry.academicYearId
        ? yearById.get(entry.academicYearId)
        : undefined;
      group = {
        yearId: entry.academicYearId,
        yearLabel: year?.label ?? "",
        yearStart: year?.start_date ?? null,
        exams: [],
      };
      groups.set(key, group);
    }
    group.exams.push(entry);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.yearStart === null && b.yearStart === null) return 0;
    if (a.yearStart === null) return 1;
    if (b.yearStart === null) return -1;
    return a.yearStart < b.yearStart ? 1 : a.yearStart > b.yearStart ? -1 : 0;
  });
}

/**
 * طالبہ کی نتائج کی تاریخ لائیں — کبھی غلطی نہیں پھینکتا: ڈیٹا نہ ملے
 * تو خالی فہرست (صفحہ نہیں ٹوٹے گا)۔ صرف اپنے مدرسے کے امتحان (RLS)۔
 */
export async function getStudentExamHistory(
  supabase: ServerClient,
  madrasaId: string,
  studentId: string,
): Promise<HistoryYearGroup[]> {
  try {
    const { data: myData, error: myErr } = await supabase
      .from("exam_results")
      .select("*")
      .eq("madrasa_id", madrasaId)
      .eq("student_id", studentId);
    if (myErr || !myData || myData.length === 0) return [];
    const myResults = myData as ExamResult[];
    const examIds = [...new Set(myResults.map((r) => r.exam_id))];
    const { data: examData, error: examErr } = await supabase
      .from("exams")
      .select("*")
      .eq("madrasa_id", madrasaId)
      .in("id", examIds);
    if (examErr || !examData || examData.length === 0) return [];
    const exams = examData as Exam[];
    const { data: allData } = await supabase
      .from("exam_results")
      .select("*")
      .eq("madrasa_id", madrasaId)
      .in("exam_id", examIds);
    const allResults = (allData ?? []) as ExamResult[];
    const years = await getAllAcademicYears(supabase, madrasaId);
    return groupHistoryExams(exams, myResults, allResults, years, studentId);
  } catch {
    return [];
  }
}
