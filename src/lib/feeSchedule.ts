/**
 * مرحلہ 37 — ماہانہ فیس کا شیڈول
 * فیس شعبے کے حساب سے طے ہوتی ہے؛ کسی جماعت کی الگ رقم ہو تو وہی لگتی
 * ہے، ورنہ شعبے کی رقم لگتی ہے۔ جماعت خالی ('') ہو تو وہ پورے شعبے کی
 * فیس ہوتی ہے۔
 */
import type { DepartmentId } from "@/lib/students";

export type FeeScheduleStatus = "active" | "inactive";

export interface FeeScheduleRow {
  id: string;
  madrasa_id: string;
  department: DepartmentId;
  class_name: string;
  amount: number;
  status: FeeScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface FeeScheduleEntry {
  department: DepartmentId;
  class_name: string;
  amount: number;
}

/**
 * طالبہ کی طے شدہ ماہانہ فیس — جماعت کی الگ رقم ہو تو وہی، ورنہ شعبے
 * کی رقم؛ دونوں نہ ہوں تو null (فیس طے نہیں)۔
 */
export function feeForStudent(
  schedule: FeeScheduleEntry[],
  department: DepartmentId,
  className: string | null,
): number | null {
  const name = className ?? "";
  if (name !== "") {
    const classRow = schedule.find(
      (s) => s.department === department && s.class_name === name,
    );
    if (classRow) return classRow.amount;
  }
  const deptRow = schedule.find(
    (s) => s.department === department && s.class_name === "",
  );
  return deptRow ? deptRow.amount : null;
}

export type FeeDueStatus = "paid" | "partial" | "unpaid" | "unset";

export const FEE_DUE_STATUS_LABELS: Record<FeeDueStatus, string> = {
  paid: "ادا شدہ",
  partial: "جزوی",
  unpaid: "بقایا",
  unset: "فیس طے نہیں",
};

/** قسطوں کو جوڑ کر دیکھا جاتا ہے — پوری رقم دی ہو تو ادا شدہ، کچھ دی ہو تو جزوی */
export function dueStatus(
  expected: number | null,
  paid: number,
): FeeDueStatus {
  if (expected === null) return "unset";
  if (paid >= expected) return "paid";
  if (paid > 0) return "partial";
  return "unpaid";
}
