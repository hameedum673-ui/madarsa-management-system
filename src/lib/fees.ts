/**
 * مرحلہ 8 — فیس اور رسیدوں کی اقسام، لیبل اور مددگار
 * ادائیگی کا طریقہ صرف ریکارڈ کے لیے ہے — پیسے آن لائن نہیں آتے۔
 */

export type PaymentMethod = "cash" | "bank" | "jazzcash" | "easypaisa";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "bank",
  "jazzcash",
  "easypaisa",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "نقد",
  bank: "بینک ٹرانسفر",
  jazzcash: "جاز کیش",
  easypaisa: "ایزی پیسہ",
};

export type FeePaymentStatus = "active" | "voided";

export const FEE_PAYMENT_STATUS_LABELS: Record<FeePaymentStatus, string> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface FeePayment {
  id: string;
  madrasa_id: string;
  student_id: string;
  receipt_number: string;
  fee_month: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  note: string | null;
  status: FeePaymentStatus;
  received_by: string | null;
  created_at: string;
  updated_at: string;
}

/** پاکستان کے وقت کے مطابق موجودہ مہینہ — YYYY-MM */
export function currentMonthInKarachi(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

/** مہینہ درست شکل میں ہے؟ — YYYY-MM */
export function isValidMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** "2026-11" ← «نومبر 2026» */
export function formatMonthUrdu(value: string): string {
  if (!isValidMonth(value)) return value;
  return new Date(`${value}-01T00:00:00`).toLocaleDateString("ur-PK", {
    month: "long",
    year: "numeric",
  });
}
