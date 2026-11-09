import type { IconName } from "@/components/icons";

/** ایک شعبہ (ڈیش بورڈ کا ایک بٹن اور اس کا الگ صفحہ) */
export interface Department {
  /** مستقل شناخت، صفحے کے پتے میں بھی یہی استعمال ہوتی ہے، مثلاً ‎/departments/students */
  id: string;
  label: string;
  icon: IconName;
  /** زیرِ تعمیر صفحے پر دکھائی جانے والی وضاحت */
  desc: string;
  /** جس گروپ سے تعلق ہے، مثلاً «تعلیمی شعبہ» */
  group: string;
}

/** شعبہ جات کا ایک گروپ (ڈیش بورڈ پر ایک سرخی کے نیچے بٹنوں کا مجموعہ) */
export interface DepartmentGroup {
  id: string;
  title: string;
  icon: IconName;
  /** گرڈ کی ترتیب: c5 یعنی ایک قطار میں 5، c3 یعنی 3، c1 یعنی 1 */
  layout: "c5" | "c6" | "c3" | "c1";
  modules: Omit<Department, "group">[];
}

/** ڈیش بورڈ کا ایک اعدادوشمار کارڈ */
export interface StatCard {
  label: string;
  icon: IconName;
  note: string;
}
