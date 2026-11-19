/**
 * CSV درآمد — نمبر ایک ساتھ (ایک امتحان)
 *
 * خالص افعال (کوئی ڈیٹا بیس نہیں): تجزیہ csvImport.ts والا
 * (RFC4180) + نمبر والی جانچ saveMarks والی۔
 * ایک فائل = ایک امتحان۔ کالم: name, father_name + امتحان کا
 * ہر مضمون (ویسا ہی نام جیسا امتحان میں لکھا ہے)۔
 * خالی خانہ = اس مضمون کے نمبر نہیں ڈالنے (غلطی نہیں)۔
 * طالبہ کی پہچان نام + والد کا نام سے — نہ ملے یا دو ملیں
 * تو قطار غلطی بنتی ہے، کبھی اندازہ نہیں لگایا جاتا۔
 */
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  duplicateKey,
  parseCsv,
} from "@/lib/csvImport";

export { IMPORT_MAX_BYTES, IMPORT_MAX_ROWS, duplicateKey, parseCsv };

/** امتحان کے مضامین سے متوقع سرخی بنائیں */
export function marksImportHeaders(subjects: string[]): string[] {
  return ["name", "father_name", ...subjects];
}

export interface CleanMarksRow {
  /** فائل میں قطار کا نمبر (سرخی = 1) — غلطی/خلاصہ دکھانے کے لیے */
  row: number;
  name: string;
  fatherName: string;
  marks: { subject: string; marks: number }[];
}

export type MarksRowErrorKey =
  | "student.err.name_required"
  | "student.err.father_required"
  | "exam.marks_import.err.marks_empty"
  | "exam.err.marks_invalid";

function clean(value: string | undefined, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * ایک قطار کی جانچ — saveMarks والے اصول۔
 * درست ہو تو صاف شدہ قطار (صرف لکھے ہوئے نمبر)، غلط ہو تو
 * غلطی کی کلید۔ طالبہ کا ملنا یہاں نہیں جانچا جاتا (وہ
 * ڈیٹا بیس کا کام ہے — actions میں ہوتا ہے)۔
 */
export function validateMarksRow(
  fields: string[],
  rowNumber: number,
  subjects: string[],
): { row: CleanMarksRow } | { errorKey: MarksRowErrorKey } {
  const name = clean(fields[0], 100);
  const fatherName = clean(fields[1], 100);

  if (!name) return { errorKey: "student.err.name_required" };
  if (!fatherName) return { errorKey: "student.err.father_required" };

  const marks: { subject: string; marks: number }[] = [];
  for (let i = 0; i < subjects.length; i += 1) {
    const raw = clean(fields[2 + i], 10);
    if (raw === "") continue; // خالی خانہ = یہ مضمون چھوڑ دیں
    const value = Number(raw);
    // saveMarks جیسا: پورا عدد، 0 سے 100 تک
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      return { errorKey: "exam.err.marks_invalid" };
    }
    marks.push({ subject: subjects[i], marks: value });
  }
  if (marks.length === 0) {
    return { errorKey: "exam.marks_import.err.marks_empty" };
  }

  return { row: { row: rowNumber, name, fatherName, marks } };
}
