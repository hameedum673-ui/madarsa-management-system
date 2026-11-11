/**
 * مرحلہ 50 — تنخواہوں کے لیے اشخاص (سرور مددگار)
 * فعال اساتذہ اور فعال عملہ — نام ID سے دیکھا جاتا ہے، نقل نہیں کیا جاتا۔
 * مقررہ تنخواہ (monthly_salary) صرف یہاں پڑھی جاتی ہے — اساتذہ/عملے
 * کے ریکارڈ میں تنخواہ کہیں نہیں دکھائی جاتی۔
 */
import type { createClient } from "@/lib/supabase/server";
import type { SalaryPerson } from "@/lib/salaries";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getSalaryPersons(
  supabase: ServerClient,
  madrasaId: string,
): Promise<SalaryPerson[]> {
  const { data: teachers } = await supabase
    .from("teachers")
    .select("id, name, monthly_salary")
    .eq("madrasa_id", madrasaId)
    .eq("status", "active")
    .order("name", { ascending: true });
  const { data: staff } = await supabase
    .from("staff")
    .select("id, name, monthly_salary")
    .eq("madrasa_id", madrasaId)
    .eq("status", "active")
    .order("name", { ascending: true });

  const persons: SalaryPerson[] = [];
  for (const t of (teachers ?? []) as {
    id: string;
    name: string;
    monthly_salary: number | null;
  }[]) {
    persons.push({
      id: t.id,
      type: "teacher",
      name: t.name,
      monthly_salary: t.monthly_salary ?? null,
    });
  }
  for (const s of (staff ?? []) as {
    id: string;
    name: string;
    monthly_salary: number | null;
  }[]) {
    persons.push({
      id: s.id,
      type: "staff",
      name: s.name,
      monthly_salary: s.monthly_salary ?? null,
    });
  }
  return persons;
}
