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

/**
 * درجہ وار حاضری کی رپورٹ (مرحلہ — مہتمم کے لیے)
 * ہر جماعت: حاضر/غیر حاضر/رخصت/بیمار/باقی کی گنتی + ناموں کی فہرستیں۔
 * طلبہ نام کے حساب سے ترتیب میں آتے ہیں (سوال نام کے حساب سے کرتا ہے)،
 * اس لیے ہر فہرست بھی اسی ترتیب میں رہتی ہے۔ جماعتیں نام کے حساب سے۔
 * خالص فعل — ڈیٹا بیس نہیں چھوتا، اس لیے الگ سے جانچا جا سکتا ہے۔
 */
export interface ReportStudent {
  id: string;
  name: string;
  father_name: string;
  class_name: string | null;
}

export interface ClassAttendanceGroup {
  className: string;
  present: ReportStudent[];
  absent: ReportStudent[];
  leave: ReportStudent[];
  sick: ReportStudent[];
  unmarked: ReportStudent[];
  total: number;
}

export interface ClassAttendanceReport {
  groups: ClassAttendanceGroup[];
  present: number;
  absent: number;
  leave: number;
  sick: number;
  unmarked: number;
  total: number;
}

export function buildClassAttendanceReport(
  students: ReportStudent[],
  existing: Record<string, AttendanceStatus>,
  noClassLabel: string,
): ClassAttendanceReport {
  const report: ClassAttendanceReport = {
    groups: [],
    present: 0,
    absent: 0,
    leave: 0,
    sick: 0,
    unmarked: 0,
    total: 0,
  };
  const byClass = new Map<string, ClassAttendanceGroup>();
  for (const s of students) {
    const key = (s.class_name ?? "").trim() || noClassLabel;
    let g = byClass.get(key);
    if (!g) {
      g = {
        className: key,
        present: [],
        absent: [],
        leave: [],
        sick: [],
        unmarked: [],
        total: 0,
      };
      byClass.set(key, g);
    }
    const status = existing[s.id];
    if (status === "present") {
      g.present.push(s);
      report.present++;
    } else if (status === "absent") {
      g.absent.push(s);
      report.absent++;
    } else if (status === "leave") {
      g.leave.push(s);
      report.leave++;
    } else if (status === "sick") {
      g.sick.push(s);
      report.sick++;
    } else {
      g.unmarked.push(s);
      report.unmarked++;
    }
    g.total++;
    report.total++;
  }
  report.groups = [...byClass.values()].sort((a, b) =>
    a.className.localeCompare(b.className, "ur"),
  );
  return report;
}

/**
 * استاد کی حاضری کی تاریخ (مرحلہ — استاد کی تفصیل پر)
 * مہینے کے حساب سے گروپ (نیا مہینہ پہلے) + کل خلاصہ + حاضری کی فیصد۔
 * پرانی "late" حالت اگر کہیں رہ گئی ہو تو گنی نہیں جاتی (مرحلہ 110
 * میں پرانی late قطاریں present میں بدل دی گئی تھیں)۔
 * خالص فعل — ڈیٹا بیس نہیں چھوتا، اس لیے الگ سے جانچا جا سکتا ہے۔
 */
export interface TeacherAttendanceMonth {
  month: string; // YYYY-MM
  present: number;
  absent: number;
  leave: number;
  sick: number;
  total: number;
}

export interface TeacherAttendanceHistory {
  months: TeacherAttendanceMonth[];
  present: number;
  absent: number;
  leave: number;
  sick: number;
  total: number;
  /** حاضر ÷ نشان زدہ دن × 100؛ کوئی دن نہ ہو تو 0 */
  percentage: number;
}

export function buildTeacherAttendanceHistory(
  rows: { date: string; status: AttendanceStatus }[],
): TeacherAttendanceHistory {
  const history: TeacherAttendanceHistory = {
    months: [],
    present: 0,
    absent: 0,
    leave: 0,
    sick: 0,
    total: 0,
    percentage: 0,
  };
  const byMonth = new Map<string, TeacherAttendanceMonth>();
  for (const r of rows) {
    const month = r.date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    let m = byMonth.get(month);
    if (!m) {
      m = { month, present: 0, absent: 0, leave: 0, sick: 0, total: 0 };
      byMonth.set(month, m);
    }
    if (r.status === "present") {
      m.present++;
      history.present++;
    } else if (r.status === "absent") {
      m.absent++;
      history.absent++;
    } else if (r.status === "leave") {
      m.leave++;
      history.leave++;
    } else if (r.status === "sick") {
      m.sick++;
      history.sick++;
    } else {
      continue;
    }
    m.total++;
    history.total++;
  }
  history.months = [...byMonth.values()].sort((a, b) =>
    a.month < b.month ? 1 : a.month > b.month ? -1 : 0,
  );
  history.percentage =
    history.total > 0 ? (history.present / history.total) * 100 : 0;
  return history;
}
