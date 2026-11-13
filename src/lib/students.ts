/**
 * مرحلہ 4 — طلبہ کی اقسام، لیبل اور مددگار
 * شعبے وہی تین ہیں جو مرحلہ 1 میں منظور ہوئے تھے: حفظ، ناظرہ، درسِ نظامی۔
 * مرحلہ 90 — چوتھا شعبہ: اسکول (مدارس میں جدید تعلیم کا شعبہ)۔
 */
import type { createClient } from "@/lib/supabase/server";

export type DepartmentId = "hifz" | "nazira" | "dars_e_nizami" | "school";

export const DEPARTMENT_IDS: DepartmentId[] = [
  "hifz",
  "nazira",
  "dars_e_nizami",
  "school",
];

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  hifz: "حفظ",
  nazira: "ناظرہ",
  dars_e_nizami: "درسِ نظامی",
  school: "اسکول",
};

// مرحلہ 51 — بنین / بنات (شعبہ تعلیم سے الگ خانہ)
export type SectionId = "banin" | "banat";

/** مرحلہ 74 — داخلے کی قسم: جدید (نئی طالبہ) / قدیم (واپس آنے والی طالبہ) */
export type AdmissionType = "new" | "returning";

export const SECTION_IDS: SectionId[] = ["banin", "banat"];

export const SECTION_LABELS: Record<SectionId, string> = {
  banin: "بنین",
  banat: "بنات",
};

export type StudentStatus = "active" | "withdrawn";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "فعال",
  withdrawn: "خارج",
};

export interface Student {
  id: string;
  madrasa_id: string;
  registration_number: string;
  name: string;
  father_name: string;
  guardian_name: string | null;
  guardian_phone: string | null;
  whatsapp_number: string | null;
  date_of_birth: string | null;
  department: DepartmentId;
  section: SectionId;
  class_name: string | null;
  admission_date: string;
  admission_type: AdmissionType;
  address: string | null;
  district: string | null;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * لاگ اِن صارف کا مدرسہ اور صارف شناخت نکالیں۔
 * profiles کی RLS پالیسی صرف اپنا ریکارڈ پڑھنے دیتی ہے، اس لیے یہ محفوظ ہے۔
 */
export async function getMyMadrasa(
  supabase: ServerClient,
): Promise<{ madrasaId: string; userId: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("madrasa_id")
    .eq("id", user.id)
    .single();

  if (!data?.madrasa_id) return null;
  return { madrasaId: data.madrasa_id as string, userId: user.id };
}
