/**
 * مرحلہ 57 — حاضری کا حب: طلبہ کی حاضری + اساتذہ کی حاضری ایک بٹن میں۔
 * ڈیش بورڈ پر دونوں بٹنوں کی جگہ ایک بٹن "حاضری" ہے — یہ صفحہ اسی
 * بٹن سے کھلتا ہے۔ اندر دو حصے ہیں۔ دونوں پرانے صفحے ویسے ہی رہتے
 * ہیں؛ اجازتیں بھی الگ الگ ہی رہتی ہیں — جسے دونوں کی اجازت نہیں
 * ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

const ATTENDANCE_MODULES = [
  {
    id: "att-students",
    titleKey: "module.att-students",
    descKey: "att.hub.desc.students",
    href: "/departments/att-students",
  },
  {
    id: "att-teachers",
    titleKey: "module.att-teachers",
    descKey: "att.hub.desc.teachers",
    href: "/departments/att-teachers",
  },
] as const;

export default async function AttendanceHubPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isAppAdmin(supabase);

  const allowed: Record<string, boolean> = {};
  for (const m of ATTENDANCE_MODULES) {
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
  if (!ATTENDANCE_MODULES.some((m) => allowed[m.id])) {
    redirect("/");
  }

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "hub.attendance")}</h2>
        </div>

        {ATTENDANCE_MODULES.filter((m) => allowed[m.id]).map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{t(lang, m.titleKey)}</h3>
            <p className="sub">{t(lang, m.descKey)}</p>
            <div className="form-actions">
              <Link className="btn-primary" href={m.href}>
                {t(lang, "att.hub.open", { title: t(lang, m.titleKey) })}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
