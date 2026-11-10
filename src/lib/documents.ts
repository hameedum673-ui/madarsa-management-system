/**
 * مرحلہ 28 — دستاویزات
 * قسم: رجسٹریشن / معاہدہ / خط / سند / دیگر۔
 * حالت: فعال / میعاد ختم / محفوظ شدہ (حذف کبھی نہیں)۔
 * "میعاد ختم" کا نشان میعاد کی تاریخ سے خودبخود دکھایا جاتا ہے — حالت
 * بدلنا ضروری نہیں۔
 */
export type DocumentType =
  | "registration"
  | "agreement"
  | "letter"
  | "certificate"
  | "other";
export type DocumentStatus = "active" | "expired" | "archived";

export const DOCUMENT_TYPES: DocumentType[] = [
  "registration",
  "agreement",
  "letter",
  "certificate",
  "other",
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  registration: "رجسٹریشن",
  agreement: "معاہدہ",
  letter: "خط",
  certificate: "سند",
  other: "دیگر",
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  active: "فعال",
  expired: "میعاد ختم",
  archived: "محفوظ شدہ",
};

export interface MadrasaDocument {
  id: string;
  madrasa_id: string;
  title: string;
  doc_type: DocumentType;
  reference_no: string | null;
  issued_by: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  note: string | null;
  status: DocumentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** میعاد گزر چکی ہے؟ (صرف فعال دستاویز پر نشان دکھایا جاتا ہے) */
export function isExpired(doc: MadrasaDocument, today: string): boolean {
  return (
    doc.status === "active" &&
    !!doc.expiry_date &&
    doc.expiry_date < today
  );
}
