/**
 * مرحلہ 16 — اخراجات کی اقسام، زمرے اور مددگار
 * ادائیگی کا طریقہ فیس والا ہی ہے (PAYMENT_METHOD_LABELS، src/lib/fees.ts)۔
 * غلط خرچ حذف نہیں ہوتا — صرف منسوخ ہوتا ہے۔
 */
import type { PaymentMethod } from "@/lib/fees";
import type { SectionId } from "@/lib/students";

export type ExpenseCategory =
  | "salary"
  | "electricity"
  | "gas"
  | "water"
  | "repair"
  | "food"
  | "books"
  | "rent"
  | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "salary",
  "electricity",
  "gas",
  "water",
  "repair",
  "food",
  "books",
  "rent",
  "other",
];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  salary: "تنخواہ",
  electricity: "بجلی",
  gas: "گیس",
  water: "پانی",
  repair: "مرمت",
  food: "کھانا اور راشن",
  books: "کتابیں اور سامان",
  rent: "کرایہ",
  other: "دیگر",
};

export type ExpenseStatus = "active" | "voided";

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface Expense {
  id: string;
  madrasa_id: string;
  voucher_number: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  payment_method: PaymentMethod;
  note: string | null;
  status: ExpenseStatus;
  section: SectionId;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
