/**
 * مرحلہ 19 — زکوٰۃ کی اقسام
 * زکوٰۃ کا پیسہ الگ فنڈ ہے — یہ فیس اور عام اخراجات سے نہیں ملتا۔
 * ادائیگی کا طریقہ فیس والا ہی ہے (PAYMENT_METHOD_LABELS، src/lib/fees.ts)۔
 * غلط اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے۔
 */
import type { PaymentMethod } from "@/lib/fees";

export type ZakatKind = "received" | "distributed";

export const ZAKAT_KINDS: ZakatKind[] = ["received", "distributed"];

export const ZAKAT_KIND_LABELS: Record<ZakatKind, string> = {
  received: "وصولی",
  distributed: "تقسیم",
};

export type ZakatStatus = "active" | "voided";

export const ZAKAT_STATUS_LABELS: Record<ZakatStatus, string> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface ZakatRecord {
  id: string;
  madrasa_id: string;
  receipt_number: string;
  kind: ZakatKind;
  person_name: string;
  amount: number;
  record_date: string;
  payment_method: PaymentMethod;
  note: string | null;
  status: ZakatStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
