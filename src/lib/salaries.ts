/**
 * مرحلہ 50 — تنخواہوں کی اقسام
 * تنخواہ خفیہ معلومات ہے — یہ شعبہ صرف ایڈمن کے لیے ہے۔
 * تنخواہ دیتے ہی اخراجات میں خودکار واؤچر بنتا ہے (قسم "تنخواہ")،
 * اس لیے بیلنس، ماہانہ، سالانہ اور رپورٹس میں تنخواہ خودبخود شامل
 * ہو جاتی ہے — دوہرا حساب نہیں ہوتا۔ غلط ادائیگی حذف نہیں ہوتی —
 * صرف منسوخ ہوتی ہے (اور اس سے جڑا واؤچر بھی)۔
 */
import type { PaymentMethod } from "@/lib/fees";

export type SalaryPersonType = "teacher" | "staff";

export const SALARY_PERSON_TYPES: SalaryPersonType[] = ["teacher", "staff"];

export const SALARY_PERSON_TYPE_LABELS: Record<SalaryPersonType, string> = {
  teacher: "استاد",
  staff: "عملہ",
};

export type SalaryStatus = "active" | "voided";

export const SALARY_STATUS_LABELS: Record<SalaryStatus, string> = {
  active: "ادا شدہ",
  voided: "منسوخ",
};

export interface SalaryPayment {
  id: string;
  madrasa_id: string;
  person_type: SalaryPersonType;
  person_id: string;
  salary_month: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  note: string | null;
  expense_id: string | null;
  status: SalaryStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** فہرست کے لیے شخص — نام ID سے دیکھا جاتا ہے، نقل نہیں کیا جاتا */
export interface SalaryPerson {
  id: string;
  type: SalaryPersonType;
  name: string;
  monthly_salary: number | null;
}
