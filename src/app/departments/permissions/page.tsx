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

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const supabase = await createClient();
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

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/users-permissions" />
          <h2>اختیارات اور اجازتیں</h2>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            صارفین کی میز ابھی نہیں بنی — پہلے مرحلہ 11 کی SQL چلائیں۔
          </p>
        ) : users.length === 0 ? (
          <p className="empty-state">
            ابھی کوئی منظور شدہ صارف نہیں ہے — پہلے صارف منظور کریں۔
          </p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">صارف</span>
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
                دکھائیں
              </button>
            </form>

            <p className="sub">
              پہلے سے سب کچھ اجازت شدہ ہے — جس شعبے کا ٹک ہٹائیں گے، وہ
              شعبہ اس صارف کو نظر نہیں آئے گا اور لنک بھی نہیں کھلے گا۔
              "صارفین اور اکاؤنٹس" اور "اختیارات اور اجازتیں" صرف ایڈمن کے
              لیے ہیں، اس لیے یہاں نہیں دکھائے گئے۔ شعبے (بنین / بنات) کی
              اجازت اوپر والے حصے میں طے ہوتی ہے — اس سے ابھی کچھ بند
              نہیں ہوگا (روک مرحلہ 54 میں لگے گی)۔
            </p>

            {selectedUser ? (
              <PermissionsForm
                userEmail={selectedUser.email.toLowerCase()}
                userName={selectedUser.name}
                allowedModules={allowedModules}
                allowedSections={allowedSections}
                action={savePermissions}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
