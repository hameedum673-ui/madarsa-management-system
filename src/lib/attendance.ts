/**
 * مرحلہ 6 — طلبہ کی حاضری کی اقسام اور مددگار
 * تاریخ ہمیشہ پاکستان (Asia/Karachi) کے حساب سے لی جاتی ہے،
 * کیونکہ سرور کا وقت UTC ہو سکتا ہے اور حاضری "آج" پاکستان کا دن ہے۔
 */
export type AttendanceStatus = "present" | "absent" | "leave" | "sick";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "present",
  "absent",
  "leave",
  "sick",
];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: "حاضر",
  absent: "غیر حاضر",
  leave: "رخصت",
  sick: "مریض",
};

export interface AttendanceRecord {
  id: string;
  madrasa_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** آج کی تاریخ (YYYY-MM-DD) — پاکستان کے وقت کے مطابق */
export function todayInKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** تاریخ درست ہے اور آج سے آگے نہیں؟ */
export function isValidPastOrTodayDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  return value <= todayInKarachi();
}
