/**
 * مرحلہ 11 — صارفین اور اکاؤنٹس: ایڈمن کنٹرول
 * (صرف نظام کا ایڈمن دیکھ سکتا ہے — حصہ 2؛ مدرسے کا مالک اپنے عملے
 * کا انتظام الگ صفحے سے کرے گا)
 * منظور شدہ / زیرِ منظوری / غیر فعال — منظوری، معطلی اور دوبارہ فعال کرنا۔
 * منظوری کے وقت کردار چنا جاتا ہے؛ صارف کا profile اگلے لاگ اِن پر خود بنتا ہے۔
 * میز ابھی نہ بنی ہو (migration 009 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isSystemAdmin,
  isPrimaryAdmin,
  type ApprovedUser,
} from "@/lib/approval";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { getMyMadrasa } from "@/lib/students";
import {
  AddUserForm,
  ApproveForm,
  DemoteAdminForm,
  PromoteAdminForm,
  StatusForm,
  TransferWorkspaceForm,
} from "@/app/departments/users/UserForms";
import {
  CloseGuestForm,
  DeleteGuestForm,
  GuestSettingsForm,
} from "@/app/departments/users/GuestForms";

type GuestRow = {
  id: string;
  name: string;
  created_at: string;
  guest_expires_at: string;
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ur-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function UsersPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isSystemAdmin(supabase);
  if (!admin) {
    notFound();
  }

  // مرحلہ 81 — پہلا ایڈمن ہو تو تنزلی کے فارم دکھیں گے
  const primary = await isPrimaryAdmin(supabase);
  const mine = await getMyMadrasa(supabase);

  const { data, error } = await supabase
    .from("approved_users")
    .select("*")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as ApprovedUser[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  const pending = users.filter((u) => u.status === "pending");

  // مرحلہ 67 — مہمان رسائی کی ترتیب + مہمانوں کی فہرست
  const { data: settingsData, error: settingsError } = await supabase
    .from("guest_settings")
    .select("allow_guests, guest_hours")
    .eq("id", 1)
    .single();
  const guestTableMissing =
    (settingsError as { code?: string } | null)?.code === "42P01";
  const guestSettings = (settingsData as {
    allow_guests?: boolean;
    guest_hours?: number;
  } | null) ?? null;
  const { data: guestData } = await supabase
    .from("profiles")
    .select("id, name, created_at, guest_expires_at")
    .not("guest_expires_at", "is", null)
    .order("created_at", { ascending: false });
  const guests = (guestData ?? []) as GuestRow[];

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/users-permissions" />
          <h2>{t(lang, "users.title")}</h2>
          <span className="page-count">
            {t(lang, "users.count", {
              total: users.length.toLocaleString("ur-PK"),
              pending: pending.length.toLocaleString("ur-PK"),
            })}
          </span>
          <span className="spacer" />
          <Link className="btn-ghost" href="/departments/audit">
            {t(lang, "users.audit_link")}
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "users.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : (
          <>
            <h3 className="form-section-title">
              {t(lang, "users.add_title")}
            </h3>
            <AddUserForm lang={lang} />

            {users.length === 0 ? (
              <p className="empty-state">{t(lang, "users.empty")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.name")}</th>
                      <th>Gmail</th>
                      <th>{t(lang, "users.col_whatsapp")}</th>
                      <th>{t(lang, "users.col_role")}</th>
                      <th>{t(lang, "col.status")}</th>
                      <th>{t(lang, "col.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.name}</td>
                        <td dir="ltr">{u.email}</td>
                        <td dir="ltr">{u.whatsapp ?? "—"}</td>
                        <td>
                          {u.assigned_role
                            ? t(lang, `role.${u.assigned_role}`)
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`badge${u.status === "disabled" ? " badge-withdrawn" : ""}`}
                          >
                            {t(lang, `approval.status.${u.status}`)}
                          </span>
                        </td>
                        <td>
                          {u.status === "pending" ? (
                            <ApproveForm id={u.id} lang={lang} />
                          ) : u.status === "approved" ? (
                            <StatusForm
                              id={u.id}
                              status="disabled"
                              label={t(lang, "users.disable")}
                              lang={lang}
                            />
                          ) : (
                            <StatusForm
                              id={u.id}
                              status="approved"
                              label={t(lang, "users.reactivate")}
                              primary
                              lang={lang}
                            />
                          )}
                          {u.status === "approved" &&
                          u.assigned_role !== "super_admin" ? (
                            <span style={{ marginInlineStart: "6px" }}>
                              <PromoteAdminForm id={u.id} lang={lang} />
                            </span>
                          ) : null}
                          {u.status === "approved" &&
                          u.assigned_role === "super_admin" &&
                          primary &&
                          u.assigned_madrasa_id !== mine?.madrasaId ? (
                            <span style={{ marginInlineStart: "6px" }}>
                              <DemoteAdminForm id={u.id} lang={lang} />
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="form-note">{t(lang, "users.note")}</p>

            <h3 className="form-section-title">
              {t(lang, "guest.title")}
            </h3>
            {guestTableMissing ? (
              <p className="empty-state">
                {t(lang, "guest.table_missing")}
              </p>
            ) : (
              <>
                <GuestSettingsForm
                  allowGuests={guestSettings?.allow_guests ?? false}
                  guestHours={guestSettings?.guest_hours ?? 2}
                  lang={lang}
                />

                {guests.length === 0 ? (
                  <p className="empty-state">{t(lang, "guest.empty")}</p>
                ) : (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>{t(lang, "col.name")}</th>
                          <th>{t(lang, "guest.col_created")}</th>
                          <th>{t(lang, "guest.col_expires")}</th>
                          <th>{t(lang, "col.status")}</th>
                          <th>{t(lang, "col.action")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {guests.map((g) => {
                          const expired =
                            new Date(g.guest_expires_at).getTime() <=
                            Date.now();
                          return (
                            <tr key={g.id}>
                              <td>{g.name}</td>
                              <td>{formatDateTime(g.created_at)}</td>
                              <td>{formatDateTime(g.guest_expires_at)}</td>
                              <td>
                                <span
                                  className={`badge${expired ? " badge-withdrawn" : ""}`}
                                >
                                  {expired
                                    ? t(lang, "guest.expired")
                                    : t(lang, "guest.active")}
                                </span>
                              </td>
                              <td>
                                {expired ? (
                                  <DeleteGuestForm id={g.id} lang={lang} />
                                ) : (
                                  <CloseGuestForm id={g.id} lang={lang} />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="form-note">{t(lang, "guest.note")}</p>
              </>
            )}

            <h3 className="form-section-title">
              {t(lang, "users.transfer_title")}
            </h3>
            <p className="form-note">{t(lang, "users.transfer_note")}</p>
            <TransferWorkspaceForm lang={lang} />
          </>
        )}
      </div>
    </div>
  );
}
