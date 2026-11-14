/** بیک اپ کی میزیں — ہاتھ والا بیک اپ اور خودکار بیک اپ دونوں یہیں سے لیتے ہیں
 * (ایک ہی جگہ، تاکہ دونوں کی فائل ایک جیسی رہے اور واپس لانا دونوں پر چلے) */

/** اپنے مدرسے کی تمام میزیں — فعال اور منسوخ ریکارڈ سمیت */
export const OWN_TABLES = [
  "madrasas",
  "madrasa_profile",
  "students",
  "teachers",
  "staff",
  "classes",
  "student_attendance",
  "teacher_attendance",
  "fee_payments",
  "fee_schedule",
  "expenses",
  "salary_payments",
  "donations",
  "zakat_records",
  "ushr_records",
  "welfare_records",
  "student_expenses",
  "exams",
  "exam_results",
  "hifz_progress",
  "month_closings",
  "admissions",
  "notices",
  "library_books",
  "documents",
  "document_files",
  "audit_log",
] as const;

/** صرف ایڈمن کی میزیں */
export const ADMIN_TABLES = [
  "approved_users",
  "user_permissions",
  "user_sections",
] as const;
