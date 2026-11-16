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
import { t } from "@/i18n/dictionary";
import { getMyLanguage } from "@/lib/language";

const REPORT_MODULES = [
  {
    id: "monthly",
    titleKey: "hub.reports_page.monthly_title",
    descKey: "hub.reports_page.monthly_desc",
    href: "/departments/monthly",
  },
  {
    id: "yearly",
    titleKey: "hub.reports_page.yearly_title",
    descKey: "hub.reports_page.yearly_desc",
    href: "/departments/yearly",
  },
  {
    id: "fin-reports",
    titleKey: "hub.reports_page.finreports_title",
    descKey: "hub.reports_page.finreports_desc",
    href: "/departments/fin-reports",
  },
  {
    id: "reports",
    titleKey: "hub.reports_page.reports_title",
    descKey: "hub.reports_page.reports_desc",
    href: "/departments/reports",
  },
] as const;

export default async function ReportsHubPage() {
  const supabase = await createClient();
  const lang = await getMyLanguage();
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
          <h2>{t(lang, "hub.reports")}</h2>
        </div>

        {REPORT_MODULES.filter((m) => allowed[m.id]).map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{t(lang, m.titleKey)}</h3>
            <p className="sub">{t(lang, m.descKey)}</p>
            <div className="form-actions">
              <Link className="btn-primary" href={m.href}>
                {t(lang, m.titleKey)} {t(lang, "hub.reports_page.open")}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
