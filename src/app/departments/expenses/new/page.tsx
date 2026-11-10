/**
 * مرحلہ 16 — نیا خرچ درج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 012 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import ExpenseForm from "@/app/departments/expenses/ExpenseForm";
import { addExpense } from "@/app/departments/expenses/actions";
import { createClient } from "@/lib/supabase/server";

export default async function NewExpensePage() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .select("id", { head: true })
    .limit(1);

  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/expenses" />
          <h2>نیا خرچ درج کریں</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            اخراجات کی میز ابھی نہیں بنی — پہلے مرحلہ 16 کی SQL چلائیں۔
          </p>
        ) : (
          <ExpenseForm action={addExpense} />
        )}
      </div>
    </div>
  );
}
