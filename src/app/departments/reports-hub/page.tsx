/**
 * مرحلہ 56 — رپورٹس کا حب: ماہانہ + سالانہ + مالیاتی رپورٹس + رپورٹس
 * ایک بٹن میں۔ ڈیش بورڈ پر چاروں بٹنوں کی جگہ ایک بٹن "رپورٹس" ہے —
 * یہ صفحہ اسی بٹن سے کھلتا ہے۔ اندر چار حصے ہیں۔ چاروں پرانے صفحے
 * ویسے ہی رہتے ہیں؛ اجازتیں بھی الگ الگ ہی رہتی ہیں — جسے چاروں کی
 * اجازت نہیں ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";

const REPORT_MODULES = [
  {
    id: "monthly",
    title: "ماہانہ حسابات",
    desc: "ہر مہینے کی آمدنی، اخراجات، بقیہ اور مہینے کی بندش۔",
    href: "/departments/monthly",
  },
  {
    id: "yearly",
    title: "سالانہ حسابات",
    desc: "پورے سال کا مہینہ وار حساب اور سال کی بندش۔",
    href: "/departments/yearly",
  },
  {
    id: "fin-reports",
    title: "مالیاتی رپورٹس",
    desc: "تاریخ چن کر آمدنی، اخراجات اور بیلنس کی رپورٹ۔",
    href: "/departments/fin-reports",
  },
  {
    id: "reports",
    title: "رپورٹس",
    desc: "مدرسے کا مجموعی خلاصہ — طلبہ، اساتذہ، حاضری اور مالی خلاصہ۔",
    href: "/departments/reports",
  },
] as const;

export default async function ReportsHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

  const allowed: Record<string, boolean> = {};
  for (const m of REPORT_MODULES) {
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

  // چاروں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (!REPORT_MODULES.some((m) => allowed[m.id])) {
    redirect("/");
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>رپورٹس</h2>
        </div>

        {REPORT_MODULES.filter((m) => allowed[m.id]).map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{m.title}</h3>
            <p className="sub">{m.desc}</p>
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
