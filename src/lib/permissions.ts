/**
 * مرحلہ 26 — اختیارات اور اجازتیں
 * اجازت ای میل سے جڑی ہے (ہر صارف کی Gmail مستقل پہچان ہے)۔
 * پہلے سے سب کچھ اجازت شدہ ہے — صرف وہی شعبہ بند ہوتا ہے جسے ایڈمن واضح
 * طور پر بند کرے۔ "صارفین اور اکاؤنٹس"، "اختیارات اور اجازتیں" اور
 * "تنخواہیں" اس فہرست میں نہیں ہیں — وہ صرف ایڈمن کے لیے ہیں۔
 */
import { GROUPS } from "@/data/departments";
import { SECTION_IDS, type SectionId } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

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

/** مرحلہ 53 — صارف کے شعبے کی اجازت (بنین / بنات) */
export interface UserSectionRow {
  user_email: string;
  section: string;
  allowed: boolean;
}

/**
 * مرحلہ 54 — موجودہ صارف کو کون سے شعبے (بنین / بنات) دیکھنے کی اجازت ہے۔
 * ایڈمن → دونوں؛ ورنہ user_sections کی بند والی قطاریں ہٹا دی جاتی ہیں۔
 * کسی غلطی پر پہلے سے دونوں (کبھی غلطی سے تالا نہیں لگے گا)۔
 */
export async function getMyAllowedSections(
  supabase: ServerClient,
): Promise<Set<SectionId>> {
  const all = new Set<SectionId>(SECTION_IDS);
  try {
    if (await isAppAdmin(supabase)) return all;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return all;
    const { data } = await supabase
      .from("user_sections")
      .select("section, allowed")
      .eq("user_email", user.email.toLowerCase());
    const rows = (data ?? []) as { section: string; allowed: boolean }[];
    for (const r of rows) {
      if (!r.allowed) all.delete(r.section as SectionId);
    }
    return all;
  } catch {
    return all;
  }
}

/**
 * مرحلہ 55 — رپورٹس میں چنا ہوا شعبہ (بنین / بنات / سب)۔
 * بند شعبہ چنا ہو تو "سب" لوٹاتا ہے (یعنی اجازت والے شعبے)۔
 */
export function getMySectionFilter(
  allowedSections: Set<SectionId>,
  rawSection: string | undefined,
): SectionId | "all" {
  const raw = rawSection ?? "all";
  if (
    (SECTION_IDS as string[]).includes(raw) &&
    allowedSections.has(raw as SectionId)
  )
    return raw as SectionId;
  return "all";
}
