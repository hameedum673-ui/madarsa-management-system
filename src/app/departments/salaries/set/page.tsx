/**
 * مرحلہ 50 — مقررہ تنخواہ طے کریں (سرور صفحہ، صرف ایڈمن)
 */
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation";
import SetSalaryForm from "@/app/departments/salaries/SetSalaryForm";
import { setMonthlySalary } from "@/app/departments/salaries/actions";
import { getSalaryPersons } from "@/app/departments/salaries/people";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";

export default async function SetSalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  if (!(await isAppAdmin(supabase))) {
    redirect("/");
  }
  const mine = await getMyMadrasa(supabase);
  if (!mine) redirect("/login");

  const persons = await getSalaryPersons(supabase, mine.madrasaId);
  const rawPerson = params.person ?? "";
  const initialPerson =
    persons.some((p) => `${p.type}:${p.id}` === rawPerson) ? rawPerson : "";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/salaries" />
          <h2>مقررہ تنخواہ طے کریں</h2>
        </div>
        {persons.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی فعال استاد یا ملازم درج نہیں ہے — پہلے اساتذہ یا
            عملے کا ریکارڈ بنائیں۔
          </p>
        ) : (
          <SetSalaryForm
            action={setMonthlySalary}
            persons={persons}
            initialPerson={initialPerson}
          />
        )}
      </div>
    </div>
  );
}
