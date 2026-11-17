/**
 * مرحلہ 31 — نظام کی ترتیبات (سرور صفحہ)
 * کوئی نئی میز نہیں، کوئی SQL نہیں۔
 * میرا اکاؤنٹ (اصلی نام/کردار/Gmail/مدرسے کا نام — ڈیٹا بیس سے)، پاس ورڈ
 * تبدیل کرنا، نظام کی معلومات (اہم صفحوں کے لنک)۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import InstallAppButton from "@/components/InstallAppButton";
import ChangePasswordForm from "@/app/departments/settings/ChangePasswordForm";
import MfaSettings from "@/app/departments/settings/MfaSettings";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function SettingsPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isAppAdmin(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  let madrasaName: string | null = null;
  let userName: string | null = null;
  let userRole: string | null = null;
  const lang = await langP;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: madrasa } = await supabase
        .from("madrasas")
        .select("name")
        .eq("id", mine.madrasaId)
        .single();
      madrasaName = (madrasa as { name?: string } | null)?.name ?? null;

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", mine.userId)
        .single();
      userName = (myProfile as { name?: string } | null)?.name ?? null;
      const role = (myProfile as { role?: string } | null)?.role;
      userRole = role ? t(lang, `role.${role as MadrasaRole}`) : null;
    }
  } catch {
    madrasaName = null;
    userName = null;
    userRole = null;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "settings.title")}</h2>
        </div>

        <h3 className="form-section-title">{t(lang, "settings.account_title")}</h3>
        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "col.name")}</span>
            <strong>{userName ?? "—"}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "users.col_role")}</span>
            <strong>{userRole ?? "—"}</strong>
          </div>
          <div className="row">
            <span>Gmail</span>
            <strong>{email || "—"}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "settings.account.madrasa")}</span>
            <strong>{madrasaName ?? "—"}</strong>
          </div>
        </div>

        <ChangePasswordForm email={email} lang={lang} />

        <h3 className="form-section-title">{t(lang, "settings.mfa.name")} (2FA)</h3>
        <MfaSettings lang={lang} />

        <h3 className="form-section-title">{t(lang, "settings.logout_title")}</h3>
        <p className="sub">{t(lang, "settings.logout_note")}</p>

        <h3 className="form-section-title">{t(lang, "settings.app_title")}</h3>
        <p className="sub">{t(lang, "settings.app_note")}</p>
        <InstallAppButton lang={lang} />

        <h3 className="form-section-title">{t(lang, "settings.info_title")}</h3>
        <div className="form-actions">
          <Link className="btn-ghost" href="/departments/backup">
            {t(lang, "backup.title")}
          </Link>
          <Link className="btn-ghost" href="/departments/general">
            {t(lang, "settings.info.general")}
          </Link>
          {admin ? (
            <Link className="btn-ghost" href="/departments/users">
              {t(lang, "hub.users_perms.title")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
