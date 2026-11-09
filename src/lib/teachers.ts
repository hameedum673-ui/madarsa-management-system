/**
 * مرحلہ 5 — اساتذہ کی اقسام
 * شعبے وہی تین ہیں جو مرحلہ 1 میں منظور ہوئے تھے: حفظ، ناظرہ، درسِ نظامی۔
 * نوٹ: تنخواہ اس ماڈیول میں نہیں ہے — تنخواہ خفیہ معلومات ہے، الگ مرحلہ ہوگا۔
 */
import type { DepartmentId, StudentStatus } from "@/lib/students";

export interface Teacher {
  id: string;
  madrasa_id: string;
  name: string;
  father_name: string;
  phone: string | null;
  cnic: string | null;
  qualification: string | null;
  department: DepartmentId;
  position: string | null;
  joining_date: string;
  address: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}
