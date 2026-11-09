/**
 * مرحلہ 10 — امتحانات اور نتائج: قسمیں، درجے اور پوزیشن کا حساب
 * ہر مضمون 100 نمبر کا ہے۔ درجہ فیصد سے بنتا ہے؛ پوزیشن کل نمبروں سے
 * (برابر نمبر والوں کی پوزیشن ایک جیسی ہوتی ہے: 1، 2، 2، 4)۔
 */
import type { DepartmentId } from "@/lib/students";

export interface Exam {
  id: string;
  madrasa_id: string;
  name: string;
  exam_date: string;
  department: DepartmentId;
  class_name: string | null;
  subjects: string[];
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

/** فیصد سے درجہ — تجویز شدہ پیمانہ (مرحلہ 10) */
export function gradeForPercentage(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "فیل";
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
