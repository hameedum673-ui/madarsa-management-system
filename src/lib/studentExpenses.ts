/**
 * مرحلہ 22 — طلبہ کے اخراجات کی اقسام
 * یہ صرف فی طالبہ خرچ کا ریکارڈ ہے — رقم خود بخود ڈیش بورڈ کے بیلنس یا
 * ماہانہ حسابات سے نہیں کٹتی۔
 * غلط اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے۔
 */
export type StudentExpenseCategory =
  | "books"
  | "clothes"
  | "medical"
  | "food"
  | "other";

export const STUDENT_EXPENSE_CATEGORIES: StudentExpenseCategory[] = [
  "books",
  "clothes",
  "medical",
  "food",
  "other",
];

export const STUDENT_EXPENSE_CATEGORY_LABELS: Record<
  StudentExpenseCategory,
  string
> = {
  books: "کتابیں",
  clothes: "کپڑے",
  medical: "علاج",
  food: "کھانا",
  other: "دیگر",
};

export type StudentExpenseStatus = "active" | "voided";

export const STUDENT_EXPENSE_STATUS_LABELS: Record<
  StudentExpenseStatus,
  string
> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface StudentExpense {
  id: string;
  madrasa_id: string;
  student_id: string;
  record_number: string;
  category: StudentExpenseCategory;
  amount: number;
  expense_date: string;
  note: string | null;
  status: StudentExpenseStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  students?: {
    name: string;
    father_name: string;
    registration_number: string;
  } | null;
}
