/**
 * مرحلہ 50 — نئی تنخواہ (سرور صفحہ، صرف ایڈمن)
 */
import BackButton from "@/components/BackButton";
import { redirect } from "next/navigation";
import SalaryPaymentForm from "@/app/departments/salaries/SalaryPaymentForm";
import { addSalaryPayment } from "@/app/departments/salaries/actions";
import { getSalaryPersons } from "@/app/departments/salaries/people";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";
import { currentMonthInKarachi, isValidMonth } from "@/lib/fees";

export default async function NewSalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; month?: string }>;
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
  const initialMonth = isValidMonth(params.month ?? "")
    ? (params.month as string)
    : currentMonthInKarachi();

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/salaries" />
          <h2>نئی تنخواہ</h2>
        </div>
        {persons.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی فعال استاد یا ملازم درج نہیں ہے — پہلے اساتذہ یا
            عملے کا ریکارڈ بنائیں۔
          </p>
        ) : (
          <SalaryPaymentForm
            action={addSalaryPayment}
            persons={persons}
            initialPerson={initialPerson}
            initialMonth={initialMonth}
          />
        )}
      </div>
    </div>
  );
}
