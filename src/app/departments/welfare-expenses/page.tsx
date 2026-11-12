/**
 * مرحلہ 72 — وظائف + طلبہ کے اخراجات کا حب: دونوں ایک بٹن میں۔
 * ڈیش بورڈ پر دونوں بٹنوں کی جگہ ایک بٹن "وظائف اور طلبہ کے
 * اخراجات" ہے — یہ صفحہ اسی بٹن سے کھلتا ہے۔ اندر دو حصے ہیں۔
 * دونوں پرانے صفحے ویسے ہی رہتے ہیں؛ اجازتیں بھی الگ الگ ہی
 * رہتی ہیں — جسے دونوں کی اجازت نہیں ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";

const WELFARE_EXPENSE_MODULES = [
  {
    id: "welfare",
    table: "welfare_records",
    title: "وظائف اور مالی معاونت",
    desc: "مستحق طلبہ کے وظائف اور مالی معاونت کا ریکارڈ۔",
    href: "/departments/welfare",
  },
  {
    id: "student-exp",
    table: "student_expenses",
    title: "طلبہ کے اخراجات",
    desc: "فی طالبہ اخراجات اور ان کی تفصیل کا حساب۔",
    href: "/departments/student-exp",
  },
] as const;

export default async function WelfareExpensesHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

  const allowed: Record<string, boolean> = {};
  for (const m of WELFARE_EXPENSE_MODULES) {
    if (admin) {
      allowed[m.id] = true;
    } else {
      const { data } = await supabase.rpc("my_module_allowed", {
        p_module: m.id,
      });
      // فنکشن نہ چلا تو اجازت ہے — پرانا کام نہیں رکتا
      allowed[m.id] = data !== false;
    }
  }

  // دونوں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (!WELFARE_EXPENSE_MODULES.some((m) => allowed[m.id])) {
    redirect("/");
  }

  const mine = await getMyMadrasa(supabase);
  const counts: Record<string, number> = {};
  for (const m of WELFARE_EXPENSE_MODULES) {
    if (!allowed[m.id] || !mine) {
      counts[m.id] = 0;
      continue;
    }
    const { count } = await supabase
      .from(m.table)
      .select("*", { count: "exact", head: true })
      .eq("madrasa_id", mine.madrasaId)
      .eq("status", "active");
    counts[m.id] = count ?? 0;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>وظائف اور طلبہ کے اخراجات</h2>
        </div>

        {WELFARE_EXPENSE_MODULES.filter((m) => allowed[m.id]).map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{m.title}</h3>
            <p className="sub">
              {m.desc} کل: {counts[m.id].toLocaleString("ur-PK")}
            </p>
            <div className="form-actions">
              <Link className="btn-primary" href={m.href}>
                {m.title} کھولیں
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
