/**
 * مرحلہ 38 — حفظ کی پیش رفت (سبق / سبقی / منزل) کی اقسام
 * سبق: نیا سبق۔ سبقی: پچھلے اسباق کی دہرائی۔ منزل: پرانی یاد کی دہرائی۔
 */

export type HifzKind = "sabaq" | "sabqi" | "manzil";

export const HIFZ_KINDS: HifzKind[] = ["sabaq", "sabqi", "manzil"];

export const HIFZ_KIND_LABELS: Record<HifzKind, string> = {
  sabaq: "سبق",
  sabqi: "سبقی",
  manzil: "منزل",
};

export type HifzQuality = "excellent" | "good" | "weak";

export const HIFZ_QUALITIES: HifzQuality[] = ["excellent", "good", "weak"];

export const HIFZ_QUALITY_LABELS: Record<HifzQuality, string> = {
  excellent: "اچھا",
  good: "اوسط",
  weak: "کمزور",
};

export type HifzProgressStatus = "active" | "voided";

export const HIFZ_PROGRESS_STATUS_LABELS: Record<HifzProgressStatus, string> =
  {
    active: "فعال",
    voided: "منسوخ",
  };

export interface HifzProgress {
  id: string;
  madrasa_id: string;
  student_id: string;
  progress_date: string;
  kind: HifzKind;
  portion: string;
  quality: HifzQuality;
  listened_by: string | null;
  note: string | null;
  status: HifzProgressStatus;
  created_at: string;
  updated_at: string;
  teachers?: { name: string; father_name: string } | null;
}
