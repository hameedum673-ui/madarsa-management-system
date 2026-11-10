/**
 * مرحلہ 20 — صدقات اور عطیات کی اقسام
 * صدقہ اور عطیہ مدرسے کی عام آمدنی ہے — یہ ڈیش بورڈ کے بیلنس، ماہانہ اور
 * سالانہ حسابات کی آمدنی میں گنے جاتے ہیں۔ زکوٰۃ اس میں نہیں ملتی (وہ الگ
 * فنڈ ہے)۔ ادائیگی کا طریقہ فیس والا ہی ہے (PAYMENT_METHOD_LABELS)۔
 * غلط اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے۔
 */
import type { PaymentMethod } from "@/lib/fees";

export type DonationKind = "sadaqah" | "donation" | "other";

export const DONATION_KINDS: DonationKind[] = [
  "sadaqah",
  "donation",
  "other",
];

export const DONATION_KIND_LABELS: Record<DonationKind, string> = {
  sadaqah: "صدقہ",
  donation: "عطیہ",
  other: "دیگر",
};

export type DonationStatus = "active" | "voided";

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface Donation {
  id: string;
  madrasa_id: string;
  receipt_number: string;
  kind: DonationKind;
  donor_name: string;
  amount: number;
  donation_date: string;
  payment_method: PaymentMethod;
  note: string | null;
  status: DonationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
