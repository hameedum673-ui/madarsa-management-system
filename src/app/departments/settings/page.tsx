/**
 * مرحلہ 31 — نظام کی ترتیبات (سرور صفحہ)
 * کوئی نئی میز نہیں، کوئی SQL نہیں۔
 * میرا اکاؤنٹ (اصلی نام/کردار/Gmail/مدرسے کا نام — ڈیٹا بیس سے)، پاس ورڈ
 * تبدیل کرنا، نظام کی معلومات (اہم صفحوں کے لنک)۔
 * تعلیمی سال (migration 056) — صرف مالک یا ایڈمن کے لیے حصہ۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import InstallAppButton from "@/components/InstallAppButton";
import ChangePasswordForm from "@/app/departments/settings/ChangePasswordForm";
import AcademicYearForm from "@/app/departments/settings/AcademicYearForm";
import PastAcademicYearForm from "@/app/departments/settings/PastAcademicYearForm";
import YearEditForm from "@/app/departments/settings/YearEditForm";
import MfaSettings from "@/app/departments/settings/MfaSettings";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { getAllAcademicYears } from "@/lib/academicYears";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isAppAdmin(supabase);
  const params = (await searchParams) ?? {};
  const editId = typeof params.edit === "string" ? params.edit : "";

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

  // تعلیمی سال — صرف مالک یا ایڈمن (migration 056 سے پہلے میز نہ ہو تو
  // کچھ نہیں دکھے گا — صفحہ نہیں ٹوٹے گا)
  const ownerOrAdmin = admin || (await isMadrasaOwner(supabase));
  let allYears: Awaited<ReturnType<typeof getAllAcademicYears>> = [];
  let activeCount = 0;
  const enrolledByYear = new Map<string, number>();
  if (ownerOrAdmin) {
    try {
      const mine = await getMyMadrasa(supabase);
      if (mine) {
        allYears = await getAllAcademicYears(supabase, mine.madrasaId);
        const { count: ac } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("madrasa_id", mine.madrasaId)
          .eq("status", "active");
        activeCount = ac ?? 0;
        if (allYears.length > 0) {
          const { data: rows } = await supabase
            .from("enrollments")
            .select("academic_year_id")
            .eq("madrasa_id", mine.madrasaId);
          for (const row of rows ?? []) {
            const yid = row.academic_year_id as string;
            enrolledByYear.set(yid, (enrolledByYear.get(yid) ?? 0) + 1);
          }
        }
      }
    } catch {
      allYears = [];
      activeCount = 0;
    }
  }
  const currentYear = allYears.find((y) => y.is_current) ?? null;
  const editingYear = editId
    ? (allYears.find((y) => y.id === editId) ?? null)
    : null;

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

        {ownerOrAdmin ? (
          <>
            <h3 className="form-section-title">{t(lang, "settings.year.title")}</h3>
            {allYears.length > 0 ? (
              <div className="detail-rows">
                {allYears.map((year) => (
                  <div className="row" key={year.id}>
                    <span>
                      {year.label} — {year.start_date}
                      {year.is_current
                        ? ` (${t(lang, "settings.year.current")})`
                        : ""}{" "}
                      <Link
                        className="btn-ghost"
                        href={`/departments/settings?edit=${year.id}`}
                      >
                        {t(lang, "settings.year.edit")}
                      </Link>
                    </span>
                    <strong>
                      {t(lang, "settings.year.enrolled", {
                        n: (enrolledByYear.get(year.id) ?? 0).toLocaleString("ur-PK"),
                      })}
                    </strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sub">{t(lang, "settings.year.no_years")}</p>
            )}
            {editingYear ? (
              <YearEditForm lang={lang} year={editingYear} />
            ) : null}
            {currentYear ? null : (
              <AcademicYearForm lang={lang} activeCount={activeCount} />
            )}
            <div className="form-actions">
              <Link
                className="btn-primary"
                href="/departments/students/promotion"
              >
                {t(lang, "promotion.link")}
              </Link>
            </div>
            <h3 className="form-section-title">
              {t(lang, "settings.year.past_title")}
            </h3>
            <PastAcademicYearForm lang={lang} />
          </>
        ) : null}

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
