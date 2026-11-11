/**
 * مرحلہ 5 — اساتذہ کی اقسام
 * شعبے وہی تین ہیں جو مرحلہ 1 میں منظور ہوئے تھے: حفظ، ناظرہ، درسِ نظامی۔
 * نوٹ: تنخواہ اس ماڈیول میں نہیں دکھائی جاتی — تنخواہ خفیہ معلومات
 * ہے، صرف تنخواہوں والے شعبے (مرحلہ 50، صرف ایڈمن) میں نظر آتی ہے۔
 */
import type { DepartmentId, SectionId, StudentStatus } from "@/lib/students";

export interface Teacher {
  id: string;
  madrasa_id: string;
  name: string;
  father_name: string;
  phone: string | null;
  cnic: string | null;
  qualification: string | null;
  department: DepartmentId;
  section: SectionId;
  position: string | null;
  joining_date: string;
  address: string | null;
  monthly_salary: number | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}
