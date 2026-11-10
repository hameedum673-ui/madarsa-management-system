/**
 * مرحلہ 14 — درجات اور جماعتوں کی اقسام
 * شعبے وہی تین ہیں جو مرحلہ 1 میں منظور ہوئے تھے: حفظ، ناظرہ، درسِ نظامی۔
 * حالت یہاں "فعال / غیر فعال" ہے (طلبہ/اساتذہ والے "فعال / خارج" سے الگ،
 * کیونکہ جماعت خارج نہیں ہوتی، صرف غیر فعال ہوتی ہے)۔
 */
import type { DepartmentId } from "@/lib/students";

export type ClassStatus = "active" | "inactive";

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  active: "فعال",
  inactive: "غیر فعال",
};

export interface MadrasaClass {
  id: string;
  madrasa_id: string;
  name: string;
  department: DepartmentId;
  sort_order: number;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}
