/**
 * مرحلہ 21 — فلاحی کام (وظائف اور مالی معاونت) کی اقسام
 * یہ صرف معاونت کا ریکارڈ ہے — رقم خود بخود زکوٰۃ کے بیلنس یا ڈیش بورڈ کے
 * بیلنس سے نہیں کٹتی۔
 * غلط اندراج حذف نہیں ہوتا — صرف منسوخ ہوتا ہے۔
 */
export type WelfareKind = "scholarship" | "support" | "other";

export const WELFARE_KINDS: WelfareKind[] = [
  "scholarship",
  "support",
  "other",
];

export const WELFARE_KIND_LABELS: Record<WelfareKind, string> = {
  scholarship: "وظیفہ",
  support: "مالی معاونت",
  other: "دیگر",
};

export type WelfareStatus = "active" | "voided";

export const WELFARE_STATUS_LABELS: Record<WelfareStatus, string> = {
  active: "فعال",
  voided: "منسوخ",
};

export interface WelfareRecord {
  id: string;
  madrasa_id: string;
  student_id: string;
  record_number: string;
  kind: WelfareKind;
  amount: number;
  record_date: string;
  note: string | null;
  status: WelfareStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  students?: {
    name: string;
    father_name: string;
    registration_number: string;
  } | null;
}
