/**
 * مرحلہ 42 — بیک اپ واپس لانے (restore) کی ترتیب اور اصول
 * بحال صرف وہی میزیں ہوتی ہیں جو یہاں درج ہیں — اسی ترتیب میں، تاکہ
 * جن میزوں کا دوسری میزوں سے تعلق ہے وہ پہلے بحال ہوں۔
 * چھوڑی جانے والی میزیں: madrasas، madrasa_profile (پروفائل ویسا ہی
 * رہتا ہے)، audit_log (تاریخ کبھی واپس نہیں ڈالی جاتی)، approved_users
 * اور user_permissions (صارفین اور اجازتیں حفاظت کے لیے نہیں بحال
 * ہوتیں)، document_files (فائل خود بیک اپ میں نہیں ہوتی)۔
 */

export interface RestoreTable {
  table: string;
  label: string;
  /** مالی مہینے والا کھیت — بند مہینے کا ریکارڈ نہیں لگایا جاتا */
  monthField?: string;
  /** کھیت پہلے سے 'YYYY-MM' کی شکل میں ہو (فیس کا مہینہ) */
  monthFieldIsMonth?: boolean;
}

export const RESTORE_TABLES: RestoreTable[] = [
  { table: "students", label: "طلبہ" },
  { table: "teachers", label: "اساتذہ" },
  { table: "staff", label: "عملہ" },
  { table: "classes", label: "درجات اور جماعتیں" },
  { table: "admissions", label: "داخلے" },
  { table: "student_attendance", label: "طلبہ کی حاضری" },
  { table: "teacher_attendance", label: "اساتذہ کی حاضری" },
  {
    table: "fee_payments",
    label: "فیس کی رسیدیں",
    monthField: "fee_month",
    monthFieldIsMonth: true,
  },
  { table: "fee_schedule", label: "طے شدہ فیس" },
  { table: "expenses", label: "اخراجات", monthField: "expense_date" },
  {
    table: "salary_payments",
    label: "تنخواہیں",
    monthField: "salary_month",
    monthFieldIsMonth: true,
  },
  { table: "donations", label: "عطیات", monthField: "donation_date" },
  { table: "zakat_records", label: "زکوٰۃ کا ریکارڈ", monthField: "record_date" },
  { table: "ushr_records", label: "عشر کا ریکارڈ", monthField: "record_date" },
  { table: "welfare_records", label: "وظائف اور مالی معاونت", monthField: "record_date" },
  {
    table: "student_expenses",
    label: "طلبہ کے اخراجات",
    monthField: "expense_date",
  },
  { table: "exams", label: "امتحانات" },
  { table: "exam_results", label: "امتحان کے نتائج" },
  { table: "hifz_progress", label: "حفظ کی پیش رفت" },
  { table: "month_closings", label: "مہینے کی بندش" },
  { table: "notices", label: "اطلاعات اور اعلانات" },
  { table: "documents", label: "دستاویزات" },
];

export const MAX_BACKUP_FILE_SIZE = 10 * 1024 * 1024;

export interface RestoreTableReport {
  table: string;
  label: string;
  total: number;
  added: number;
  skipped: number;
  closed: number;
  failed: number;
}
