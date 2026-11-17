/**
 * مرحلہ 73 — صارفین + اختیارات کا حب: دونوں ایک بٹن میں۔
 * ڈیش بورڈ پر دونوں بٹنوں کی جگہ ایک بٹن "صارفین اور اختیارات"
 * ہے — یہ صفحہ اسی بٹن سے کھلتا ہے۔ اندر دو حصے ہیں۔
 * دونوں پرانے صفحے ویسے ہی رہتے ہیں۔ یہ حب صرف ایڈمن کے لیے
 * ہے — دونوں شعبے ایڈمن کے لیے ہیں۔
 * حصہ 2 — نظام کے ایڈمن کو دونوں حصے ویسے ہی نظر آتے ہیں؛ مدرسے
 * کے مالک کو صرف "عملے کے ارکان" والا حصہ نظر آتا ہے (عملے والا
 * صفحہ حصہ 3 میں بنے گا)۔
 * درستگی (2026-11-17) — جو مالک اور نظام کا ایڈمن دونوں ہو (حمید
 * کے اپنے اکاؤنٹ) اسے تینوں حصے نظر آتے ہیں؛ جو صرف مالک ہو اسے
 * صرف عملے والا حصہ، اور جو صرف نظام کا ایڈمن ہو اسے صرف پہلے دو۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner, isSystemAdmin } from "@/lib/approval";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

const USERS_PERMISSIONS_MODULES = [
  {
    id: "users",
    href: "/departments/users",
  },
  {
    id: "permissions",
    href: "/departments/permissions",
  },
] as const;

type HubModule = { id: string; href: string };

const STAFF_MODULE: HubModule = {
  id: "staff",
  href: "/departments/staff-members",
};

export default async function UsersPermissionsHubPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isAppAdmin(supabase);
  // حصہ 4 کی درستگی — حب مالک کے لیے بھی کھلا ہے (اسے صرف عملے والا حصہ دکھتا ہے)
  const owner = await isMadrasaOwner(supabase);
  if (!admin && !owner) {
    notFound();
  }
  // حصہ 2 — نظام کا ایڈمن یا مدرسے کا مالک؟
  // درستگی (2026-11-17) — عملے والا حصہ مالک ہونے پر دکھتا ہے،
  // چاہے وہ نظام کا ایڈمن بھی ہو؛ پہلے دونوں میں سے ایک ہی دکھتا تھا۔
  const systemAdmin = await isSystemAdmin(supabase);
  const modules: HubModule[] = systemAdmin
    ? [...USERS_PERMISSIONS_MODULES, ...(owner ? [STAFF_MODULE] : [])]
    : [STAFF_MODULE];

  const { count } = await supabase
    .from("approved_users")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  const approvedUsers = count ?? 0;

  // مالک کے اپنے مدرسے کا فعال عملہ (RLS خود صرف اپنا مدرسہ دکھاتی ہے)
  // درستگی (2026-11-17) — گنتی تب چاہیے جب عملے والا حصہ دکھے، یعنی مالک ہونے پر
  let staffCount = 0;
  if (owner) {
    const { count: sc } = await supabase
      .from("approved_users")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("member_type", "staff");
    staffCount = sc ?? 0;
  }

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "hub.users_perms.title")}</h2>
        </div>

        {modules.map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">
              {t(lang, `hub.users_perms.${m.id}_title`)}
            </h3>
            <p className="sub">
              {t(lang, `hub.users_perms.${m.id}_desc`)}
              {m.id === "users"
                ? ` ${t(lang, "hub.users_perms.users_count", { count: approvedUsers.toLocaleString("ur-PK") })}`
                : m.id === "staff"
                  ? ` ${t(lang, "hub.users_perms.staff_count", { count: staffCount.toLocaleString("ur-PK") })}`
                  : ""}
            </p>
            <div className="form-actions">
              <Link className="btn-primary" href={m.href}>
                {t(lang, "hub.users_perms.open", {
                  title: t(lang, `hub.users_perms.${m.id}_title`),
                })}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
