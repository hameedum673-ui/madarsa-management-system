/**
 * CSV درآمد — طالبات کی فہرست ایک فائل سے (پرانا ڈیٹا)
 *
 * خالص افعال (کوئی ڈیٹا بیس نہیں): RFC4180 تجزیہ (کوٹس، کوما،
 * کوٹس کے اندر نئی سطر، UTF-8 BOM) + فارم والی ہی جانچ۔
 * جانچ کے اصول وہی ہیں جو addStudent میں ہیں — کوئی نرمی نہیں۔
 */
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";

export const IMPORT_MAX_BYTES = 1_000_000; // 1 MB
export const IMPORT_MAX_ROWS = 500;

export const IMPORT_HEADERS = [
  "name",
  "father_name",
  "department",
  "section",
  "class_name",
  "admission_date",
  "district",
  "guardian_name",
  "address",
] as const;

export interface ImportRow {
  /** فائل میں قطار کا نمبر (سرخی = 1) — غلطی/خلاصہ دکھانے کے لیے */
  row: number;
  name: string;
  fatherName: string;
  guardianName: string;
  department: DepartmentId;
  section: SectionId;
  className: string;
  admissionDate: string;
  district: string;
  address: string;
}

/** CSV متن کو قطاروں میں توڑیں — ہر قطار کھیتوں کی فہرست */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += ch;
        i += 1;
      }
    } else if (ch === '"') {
      inQuotes = true;
      i += 1;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
    } else if (ch === "\r") {
      // CRLF یا اکیلا CR — سطر ختم
      if (src[i + 1] === "\n") i += 1;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
    } else if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += 1;
    } else {
      field += ch;
      i += 1;
    }
  }
  // آخری قطار (بغیر سطر ختم کیے)
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function clean(value: string | undefined, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * تاریخ — دو شکلیں قبول: DD-MM-YYYY (05-04-2025 — اب یہی بتائی جاتی ہے)
 * اور پرانی YYYY-MM-DD (پہلے سے بنی فائلیں چلتی رہیں)۔ درست ہو تو
 * ISO شکل (YYYY-MM-DD) ورنہ null۔ پہلا حصہ 4 ہندسوں کا ہو تو سال پہلے۔
 */
function normalizeDate(value: string): string | null {
  const dmy = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value);
  const ymd = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  let day: number, month: number, year: number;
  if (dmy) {
    day = Number(dmy[1]);
    month = Number(dmy[2]);
    year = Number(dmy[3]);
  } else if (ymd) {
    year = Number(ymd[1]);
    month = Number(ymd[2]);
    day = Number(ymd[3]);
  } else {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // "Z" لازم — ورنہ سرور کے ٹائم زون میں آدھی رات UTC میں پچھلا دن
  // بن جاتی ہے اور ہر تاریخ غلط قرار پاتی ہے (پاکستان +05:00)
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  // 31-02-2025 جیسی جعلی تاریخ پکڑیں (Date اسے 3 مارچ بنا دیتا ہے)
  if (d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

function notFuture(value: string): boolean {
  const d = new Date(value + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
}

export type RowErrorKey =
  | "student.err.name_required"
  | "student.err.father_required"
  | "student.err.dept_invalid"
  | "student.err.section_invalid"
  | "student.err.admission_date_invalid"
  | "student.err.admission_date_future"
  | "student.err.section_denied";

/**
 * ایک قطار کی جانچ — فارم (validateFields) والے اصول۔
 * درست ہو تو صاف شدہ قطار، غلط ہو تو غلطی کی کلید۔
 */
export function validateImportRow(
  fields: string[],
  rowNumber: number,
  allowedSections: Set<SectionId>,
): { row: ImportRow } | { errorKey: RowErrorKey } {
  const byHeader = (name: string): string => {
    const idx = IMPORT_HEADERS.indexOf(name as (typeof IMPORT_HEADERS)[number]);
    return clean(idx >= 0 ? fields[idx] : undefined, 100);
  };
  const name = byHeader("name");
  const fatherName = byHeader("father_name");
  const guardianName = clean(
    fields[IMPORT_HEADERS.indexOf("guardian_name")],
    100,
  );
  const department = byHeader("department");
  const section = byHeader("section");
  const className = clean(fields[IMPORT_HEADERS.indexOf("class_name")], 100);
  const admissionDateRaw = clean(
    fields[IMPORT_HEADERS.indexOf("admission_date")],
    10,
  );
  // دونوں شکلیں قبول؛ محفوظ ہمیشہ ISO شکل ہوتی ہے
  const admissionDate = normalizeDate(admissionDateRaw);
  const district = clean(fields[IMPORT_HEADERS.indexOf("district")], 100);
  // پتہ — آخری کالم، اختیاری (پرانی 8 کالم والی فائل میں یہ کھیت نہیں ہوتا)
  const address = clean(fields[IMPORT_HEADERS.indexOf("address")], 500);

  if (!name) return { errorKey: "student.err.name_required" };
  if (!fatherName) return { errorKey: "student.err.father_required" };
  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { errorKey: "student.err.dept_invalid" };
  if (!SECTION_IDS.includes(section as SectionId))
    return { errorKey: "student.err.section_invalid" };
  if (!admissionDate)
    return { errorKey: "student.err.admission_date_invalid" };
  if (!notFuture(admissionDate))
    return { errorKey: "student.err.admission_date_future" };
  if (!allowedSections.has(section as SectionId))
    return { errorKey: "student.err.section_denied" };

  return {
    row: {
      row: rowNumber,
      name,
      fatherName,
      guardianName,
      department: department as DepartmentId,
      section: section as SectionId,
      className,
      admissionDate,
      district,
      address,
    },
  };
}

/** نقل کی پہچان — نام + والد کا نام (خالی جگہ اور بڑے/چھوٹے حرف سے پاک) */
export function duplicateKey(name: string, fatherName: string): string {
  return `${name.trim().toLowerCase()}|${fatherName.trim().toLowerCase()}`;
}
