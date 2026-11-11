/**
 * مرحلہ 4 — طلبہ کی اقسام، لیبل اور مددگار
 * شعبے وہی تین ہیں جو مرحلہ 1 میں منظور ہوئے تھے: حفظ، ناظرہ، درسِ نظامی۔
 */
import type { createClient } from "@/lib/supabase/server";

export type DepartmentId = "hifz" | "nazira" | "dars_e_nizami";

export const DEPARTMENT_IDS: DepartmentId[] = [
  "hifz",
  "nazira",
  "dars_e_nizami",
];

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  hifz: "حفظ",
  nazira: "ناظرہ",
  dars_e_nizami: "درسِ نظامی",
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
  class_name: string | null;
  admission_date: string;
  address: string | null;
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
