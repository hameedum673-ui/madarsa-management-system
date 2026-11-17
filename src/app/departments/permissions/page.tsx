/**
 * مرحلہ 26 — اختیارات اور اجازتیں (سرور صفحہ، صرف نظام کا ایڈمن — حصہ 2)
 * منظور شدہ صارف چنیں، اس کے شعبوں کی اجازتیں مقرر کریں۔
 * پہلے سے سب کچھ اجازت شدہ ہے — ایڈمن صرف وہی بند کرتا ہے جو بند کرنا ہو۔
 * "صارفین اور اکاؤنٹس" اور "اختیارات اور اجازتیں" یہاں نہیں دکھائے گئے —
 * وہ صرف ایڈمن کے لیے ہیں۔
 * میز ابھی نہ بنی ہو (migration 019 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isSystemAdmin, type ApprovedUser } from "@/lib/approval";
import { SECTION_IDS } from "@/lib/students";
import { PERMISSION_MODULE_IDS } from "@/lib/permissions";
import PermissionsForm from "@/app/departments/permissions/PermissionsForm";
import { savePermissions } from "@/app/departments/permissions/actions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isSystemAdmin(supabase);
  if (!admin) {
    notFound();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const adminEmail = (user?.email ?? "").toLowerCase();

  const { data, error } = await supabase
    .from("approved_users")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  const users = ((data ?? []) as ApprovedUser[]).filter(
    (u) => u.email.toLowerCase() !== adminEmail,
  );
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  const params = await searchParams;
  const selectedEmail =
    params.user?.toLowerCase() ?? users[0]?.email.toLowerCase() ?? "";
  const selectedUser = users.find(
    (u) => u.email.toLowerCase() === selectedEmail,
  );

  let allowedModules = new Set<string>();
  if (selectedUser) {
    const { data: permData } = await supabase
      .from("user_permissions")
      .select("module, allowed")
      .eq("user_email", selectedUser.email.toLowerCase());
    const rows = (permData ?? []) as { module: string; allowed: boolean }[];
    // کوئی قطار نہ ہو تو اجازت ہے — صرف false والی قطاریں ہٹائی جاتی ہیں
    allowedModules = new Set(PERMISSION_MODULE_IDS);
    for (const r of rows) {
      if (!r.allowed) allowedModules.delete(r.module);
    }
  }

  // مرحلہ 53 — شعبے کی اجازت (بنین / بنات)؛ میز نہ بنی ہو تو دونوں
  let allowedSections = new Set<string>(SECTION_IDS);
  if (selectedUser) {
    const { data: secData } = await supabase
      .from("user_sections")
      .select("section, allowed")
      .eq("user_email", selectedUser.email.toLowerCase());
    const secRows = (secData ?? []) as {
      section: string;
      allowed: boolean;
    }[];
    allowedSections = new Set(SECTION_IDS);
    for (const r of secRows) {
      if (!r.allowed) allowedSections.delete(r.section);
    }
  }

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/users-permissions" />
          <h2>{t(lang, "permissions.title")}</h2>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "users.table_missing")}</p>
        ) : users.length === 0 ? (
          <p className="empty-state">{t(lang, "permissions.empty")}</p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">
                  {t(lang, "permissions.user")}
                </span>
                <select
                  className="field-input"
                  name="user"
                  defaultValue={selectedUser?.email ?? ""}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name} — {u.email}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                {t(lang, "common.show")}
              </button>
            </form>

            <p className="sub">{t(lang, "permissions.sub")}</p>

            {selectedUser ? (
              <PermissionsForm
                userEmail={selectedUser.email.toLowerCase()}
                userName={selectedUser.name}
                allowedModules={allowedModules}
                allowedSections={allowedSections}
                action={savePermissions}
                lang={lang}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
