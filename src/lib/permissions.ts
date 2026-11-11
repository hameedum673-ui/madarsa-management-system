/**
 * مرحلہ 26 — اختیارات اور اجازتیں
 * اجازت ای میل سے جڑی ہے (ہر صارف کی Gmail مستقل پہچان ہے)۔
 * پہلے سے سب کچھ اجازت شدہ ہے — صرف وہی شعبہ بند ہوتا ہے جسے ایڈمن واضح
 * طور پر بند کرے۔ "صارفین اور اکاؤنٹس"، "اختیارات اور اجازتیں" اور
 * "تنخواہیں" اس فہرست میں نہیں ہیں — وہ صرف ایڈمن کے لیے ہیں۔
 */
import { GROUPS } from "@/data/departments";

/** وہ 26 شعبے جن کی اجازت ایڈمن مقرر کر سکتا ہے (مرحلہ 48 سے عشر بھی) */
export const PERMISSION_MODULE_IDS: string[] = GROUPS.flatMap((g) =>
  g.modules
    .filter(
      (m) =>
        m.id !== "users" && m.id !== "permissions" && m.id !== "salaries",
    )
    .map((m) => m.id),
);

export interface UserPermissionRow {
  user_email: string;
  module: string;
  allowed: boolean;
}
