/**
 * مرحلہ 9 — نئے داخلے: قسمیں اور لیبل
 * داخلہ ایک درخواست ہے (زیرِ غور / منظور / مسترد)؛ منظور ہونے پر اس سے
 * طالبہ کا ریکارڈ بنتا ہے اور student_id سے جڑ جاتا ہے۔
 */
import type {
  AdmissionType,
  DepartmentId,
  SectionId,
} from "@/lib/students";

export type AdmissionStatus = "pending" | "approved" | "rejected";

export const ADMISSION_STATUS_LABELS: Record<AdmissionStatus, string> = {
  pending: "زیرِ غور",
  approved: "منظور",
  rejected: "مسترد",
};

export const ADMISSION_STATUS_IDS: AdmissionStatus[] = [
  "pending",
  "approved",
  "rejected",
];

/** مرحلہ 74 — داخلے کی قسم: جدید / قدیم */
export const ADMISSION_TYPE_LABELS: Record<AdmissionType, string> = {
  new: "جدید",
  returning: "قدیم",
};

export const ADMISSION_TYPE_IDS: AdmissionType[] = ["new", "returning"];

/** قسم نہ ملی ہو (پرانی SQL نہ چلی ہو) تو جدید سمجھیں — ڈیٹا بیس کا پہلے سے طے شدہ بھی یہی ہے */
export function admissionTypeLabel(value: string | null | undefined): string {
  return value === "returning" ? "قدیم" : "جدید";
}

export interface Admission {
  id: string;
  madrasa_id: string;
  student_id: string | null;
  applicant_name: string;
  father_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  whatsapp_number: string | null;
  date_of_birth: string | null;
  department: DepartmentId;
  section: SectionId;
  class_name: string | null;
  admission_date: string;
  admission_type: AdmissionType;
  previous_madrasa: string | null;
  note: string | null;
  status: AdmissionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
