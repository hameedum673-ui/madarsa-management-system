/**
 * مرحلہ 35 — آڈٹ لاگ دیکھنے کے لیے لیبل اور زمرے
 * audit_log میں ہر کام انگریزی نام سے لکھا جاتا ہے (جیسے student_created)؛
 * یہاں اس کا اردو مطلب اور زمرہ بتایا جاتا ہے۔
 */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  student_created: "طالبہ شامل کی گئی",
  student_updated: "طالبہ کا ریکارڈ بدلا گیا",
  teacher_created: "استاد شامل کیا گیا",
  teacher_updated: "استاد کا ریکارڈ بدلا گیا",
  staff_created: "عملے کا رکن شامل کیا گیا",
  staff_updated: "عملے کا ریکارڈ بدلا گیا",
  class_created: "جماعت بنائی گئی",
  class_updated: "جماعت بدلی گئی",
  attendance_marked: "طلبہ کی حاضری لگائی گئی",
  teacher_attendance_marked: "اساتذہ کی حاضری لگائی گئی",
  fee_payment_created: "فیس کی رسید درج کی گئی",
  fee_payment_voided: "فیس کی رسید منسوخ کی گئی",
  fee_schedule_saved: "فیس کا شیڈول طے کیا گیا",
  month_closed: "مہینہ بند کیا گیا",
  month_reopened: "مہینہ دوبارہ کھولا گیا",
  year_closed: "پورا سال بند کیا گیا",
  fee_schedule_deactivated: "فیس کا شیڈول غیر فعال کیا گیا",
  expense_created: "خرچ درج کیا گیا",
  expense_voided: "خرچ منسوخ کیا گیا",
  zakat_created: "زکوٰۃ کا اندراج کیا گیا",
  zakat_voided: "زکوٰۃ کا اندراج منسوخ کیا گیا",
  ushr_created: "عشر کا اندراج کیا گیا",
  ushr_voided: "عشر کا اندراج منسوخ کیا گیا",
  donation_created: "عطیہ درج کیا گیا",
  donation_voided: "عطیہ منسوخ کیا گیا",
  welfare_created: "وظیفہ / معاونت درج کی گئی",
  welfare_voided: "وظیفہ / معاونت منسوخ کی گئی",
  student_expense_created: "طالبہ کا خرچ درج کیا گیا",
  student_expense_voided: "طالبہ کا خرچ منسوخ کیا گیا",
  salary_created: "تنخواہ دی گئی",
  salary_voided: "تنخواہ کی ادائیگی منسوخ کی گئی",
  salary_set: "مقررہ تنخواہ طے کی گئی",
  admission_created: "داخلہ درخواست درج کی گئی",
  admission_approved: "داخلہ منظور کیا گیا",
  admission_rejected: "داخلہ مسترد کیا گیا",
  exam_created: "امتحان بنایا گیا",
  exam_updated: "امتحان میں ترمیم کی گئی",
  marks_saved: "نمبر محفوظ کیے گئے",
  hifz_progress_created: "حفظ کی پیش رفت درج کی گئی",
  hifz_progress_voided: "حفظ کی پیش رفت منسوخ کی گئی",
  notice_created: "اطلاع بنائی گئی",
  notice_updated: "اطلاع بدلی گئی",
  notice_archived: "اطلاع محفوظ کی گئی",
  document_created: "دستاویز درج کی گئی",
  document_file_uploaded: "دستاویز کے ساتھ فائل لگائی گئی",
  document_file_voided: "دستاویز کی فائل چھپائی گئی",
  document_updated: "دستاویز بدلی گئی",
  document_archived: "دستاویز محفوظ کی گئی",
  user_added: "صارف شامل کیا گیا",
  user_approved: "صارف منظور کیا گیا",
  user_disabled: "صارف غیر فعال کیا گیا",
  user_reactivated: "صارف دوبارہ فعال کیا گیا",
  user_promoted: "صارف کو ایڈمن بنایا گیا",
  user_demoted: "صارف کا ایڈمن ختم کیا گیا",
  staff_added: "عملے کا رکن شامل کیا گیا",
  staff_disabled: "عملے کے رکن کی رسائی بند کی گئی",
  staff_reactivated: "عملے کے رکن کی رسائی بحال کی گئی",
  guest_settings_updated: "مہمان رسائی کی ترتیب بدلی گئی",
  guest_closed: "مہمان کی رسائی بند کی گئی",
  guest_deleted: "مہمان کا ڈیٹا مٹایا گیا",
  permissions_updated: "اجازتیں بدلی گئیں",
  madrasa_profile_updated: "مدرسے کی معلومات بدلی گئیں",
  workspace_created: "الگ مدرسہ بنایا گیا",
  backup_restored: "بیک اپ واپس لایا گیا",
};

export const AUDIT_CATEGORIES = [
  { id: "all", label: "سب", actions: null as string[] | null },
  {
    id: "students",
    label: "طلبہ اور داخلے",
    actions: [
      "student_created",
      "student_updated",
      "admission_created",
      "admission_approved",
      "admission_rejected",
      "hifz_progress_created",
      "hifz_progress_voided",
    ],
  },
  {
    id: "staff",
    label: "اساتذہ اور عملہ",
    actions: [
      "teacher_created",
      "teacher_updated",
      "staff_created",
      "staff_updated",
    ],
  },
  {
    id: "attendance",
    label: "حاضری",
    actions: ["attendance_marked", "teacher_attendance_marked"],
  },
  {
    id: "finance",
    label: "مالیات",
    actions: [
      "fee_payment_created",
      "fee_payment_voided",
      "fee_schedule_saved",
      "fee_schedule_deactivated",
      "expense_created",
      "expense_voided",
      "zakat_created",
      "zakat_voided",
      "ushr_created",
      "ushr_voided",
      "donation_created",
      "donation_voided",
      "welfare_created",
      "welfare_voided",
      "student_expense_created",
      "student_expense_voided",
      "salary_created",
      "salary_voided",
      "salary_set",
      "month_closed",
      "month_reopened",
      "year_closed",
    ],
  },
  {
    id: "exams",
    label: "امتحانات",
    actions: ["exam_created", "exam_updated", "marks_saved"],
  },
  {
    id: "notices",
    label: "اطلاعات اور دستاویزات",
    actions: [
      "notice_created",
      "notice_updated",
      "notice_archived",
      "document_created",
      "document_updated",
      "document_archived",
      "document_file_uploaded",
      "document_file_voided",
    ],
  },
  {
    id: "users",
    label: "صارفین اور نظام",
    actions: [
      "user_added",
      "user_approved",
      "user_disabled",
      "user_reactivated",
      "user_promoted",
      "user_demoted",
      "staff_added",
      "staff_disabled",
      "staff_reactivated",
      "guest_settings_updated",
      "guest_closed",
      "guest_deleted",
      "permissions_updated",
      "madrasa_profile_updated",
      "workspace_created",
      "backup_restored",
    ],
  },
] as const;

export type AuditCategoryId = (typeof AUDIT_CATEGORIES)[number]["id"];

/** تفصیل کے خانوں کا اردو مطلب — صرف سمجھ آنے والے خانے دکھائے جاتے ہیں */
const DETAIL_LABELS: Record<string, string> = {
  name: "نام",
  amount: "رقم",
  fee_month: "مہینہ",
  receipt_number: "رسید نمبر",
  voucher_number: "واؤچر نمبر",
  record_number: "ریکارڈ نمبر",
  registration_number: "رجسٹریشن نمبر",
  title: "عنوان",
  kind: "قسم",
  category: "زمرہ",
  status: "حالت",
  email: "ای میل",
  user_email: "ای میل",
  module: "شعبہ",
  present: "حاضر",
  absent: "غیر حاضر",
  leave: "رخصت",
  late: "تاخیر",
};

/**
 * details (jsonb) کو مختصر پڑھنے لائق لکیر میں بدلتا ہے۔
 * شناختی نمبر (uuid والے *_id خانے) چھپائے جاتے ہیں — صارف کو ان سے
 * کوئی مطلب نہیں ہوتا۔
 */
export function summarizeDetails(
  details: Record<string, unknown> | null,
): string {
  if (!details || typeof details !== "object") return "—";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(details)) {
    if (value === null || value === undefined || value === "") continue;
    if (key.endsWith("_id") && key !== "registration_number") continue;
    if (key === "old_madrasa_id") continue;
    const label = DETAIL_LABELS[key] ?? key;
    let text = String(value);
    if (key === "amount") text = `${Number(value).toLocaleString("ur-PK")} روپے`;
    parts.push(`${label}: ${text}`);
  }
  return parts.length > 0 ? parts.join(" — ") : "—";
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}
