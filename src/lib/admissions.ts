/**
 * مرحلہ 9 — نئے داخلے: قسمیں اور لیبل
 * داخلہ ایک درخواست ہے (زیرِ غور / منظور / مسترد)؛ منظور ہونے پر اس سے
 * طالبہ کا ریکارڈ بنتا ہے اور student_id سے جڑ جاتا ہے۔
 */
import type { DepartmentId } from "@/lib/students";

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

export interface Admission {
  id: string;
  madrasa_id: string;
  student_id: string | null;
  applicant_name: string;
  father_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  date_of_birth: string | null;
  department: DepartmentId;
  class_name: string | null;
  admission_date: string;
  previous_madrasa: string | null;
  note: string | null;
  status: AdmissionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
