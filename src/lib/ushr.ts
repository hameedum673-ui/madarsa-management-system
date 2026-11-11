/**
 * مرحلہ 48 — عشر کی اقسام
 * وکالت کا اصول: عشر کا پیسہ پہلے طالبات کا ہوتا ہے؛ داخلہ فارم کے
 * وکالت نامے سے مہتمم ان کا وکیل بن کر اسے مصالحِ مدرسہ میں خرچ کر
 * سکتا ہے — اس لیے عشر آمدنی میں شامل ہے اور بیلنس میں دکھایا جاتا ہے۔
 * ادائیگی کا طریقہ فیس والا ہی ہے (PAYMENT_METHOD_LABELS، src/lib/fees.ts)۔
 * غلط اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے۔
 */
import type { PaymentMethod } from "@/lib/fees";

export type UshrKind = "received" | "distributed";

export const USHR_KINDS: UshrKind[] = ["received", "distributed"];

export const USHR_KIND_LABELS: Record<UshrKind, string> = {
  received: "وصولی",
  distributed: "تقسیم",
};

export type UshrStatus = "active" | "voided";

export const USHR_STATUS_LABELS: Record<UshrStatus, string> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface UshrRecord {
  id: string;
  madrasa_id: string;
  receipt_number: string;
  kind: UshrKind;
  person_name: string;
  amount: number;
  record_date: string;
  payment_method: PaymentMethod;
  note: string | null;
  status: UshrStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
