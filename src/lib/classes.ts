/**
 * مرحلہ 14 — درجات اور جماعتوں کی اقسام
 * شعبے وہی تین ہیں جو مرحلہ 1 میں منظور ہوئے تھے: حفظ، ناظرہ، درسِ نظامی۔
 * حالت یہاں "فعال / غیر فعال" ہے (طلبہ/اساتذہ والے "فعال / خارج" سے الگ،
 * کیونکہ جماعت خارج نہیں ہوتی، صرف غیر فعال ہوتی ہے)۔
 */
import type { DepartmentId, SectionId } from "@/lib/students";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

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
  section: SectionId;
  sort_order: number;
  status: ClassStatus;
  created_at: string;
  updated_at: string;
}

/** مرحلہ 36 — فارموں میں جماعت کی فہرست کے لیے فعال جماعتیں */
export interface ClassOption {
  name: string;
  department: DepartmentId;
  section: SectionId;
}

export async function getActiveClasses(
  supabase: ServerClient,
): Promise<ClassOption[]> {
  try {
    const { data } = await supabase
      .from("classes")
      .select("name, department, section")
      .eq("status", "active")
      .order("department", { ascending: true })
      .order("sort_order", { ascending: true });
    return ((data ?? []) as ClassOption[]).map((c) => ({
      name: c.name,
      department: c.department,
      section: (c.section as SectionId) ?? "banat",
    }));
  } catch {
    // میز نہ بنی ہو یا کوئی خرابی ہو تو خالی فہرست — فارم ہاتھ سے لکھنے
    // والا خانہ دکھائے گا، صفحہ نہیں ٹوٹے گا۔
    return [];
  }
}
