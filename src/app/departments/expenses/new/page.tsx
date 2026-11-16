/**
 * مرحلہ 16 — نیا خرچ درج کرنے کا صفحہ
 * میز ابھی نہ بنی ہو (migration 012 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import ExpenseForm from "@/app/departments/expenses/ExpenseForm";
import { addExpense } from "@/app/departments/expenses/actions";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewExpensePage() {
  const supabase = await createClient();
  const lang = await getMyLanguage();
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
          <h2>{t(lang, "expenses.new_title")}</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            {t(lang, "expenses.table_missing")}
          </p>
        ) : (
          <ExpenseForm action={addExpense} lang={lang} />
        )}
      </div>
    </div>
  );
}
