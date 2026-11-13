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
  APPROVAL_STATUS_LABELS,
  ROLE_LABELS,
  isSystemAdmin,
  isPrimaryAdmin,
  type ApprovedUser,
} from "@/lib/approval";
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

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/users-permissions" />
          <h2>صارفین اور اکاؤنٹس</h2>
          <span className="page-count">
            کل: {users.length.toLocaleString("ur-PK")} — زیرِ منظوری:{" "}
            {pending.length.toLocaleString("ur-PK")}
          </span>
          <span className="spacer" />
          <Link className="btn-ghost" href="/departments/audit">
            سرگرمیوں کا ریکارڈ دیکھیں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            صارفین کی میز ابھی نہیں بنی — پہلے مرحلہ 11 کی SQL چلائیں۔
          </p>
        ) : error ? (
          <p className="empty-state">فہرست نہیں کھل سکی — دوبارہ کوشش کریں۔</p>
        ) : (
          <>
            <h3 className="form-section-title">نیا صارف شامل کریں</h3>
            <AddUserForm />

            {users.length === 0 ? (
              <p className="empty-state">
                ابھی کوئی صارف درج نہیں ہے۔
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>نام</th>
                      <th>Gmail</th>
                      <th>واٹس ایپ</th>
                      <th>کردار</th>
                      <th>حالت</th>
                      <th>کارروائی</th>
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
                            ? ROLE_LABELS[u.assigned_role]
                            : "—"}
                        </td>
                        <td>
                          <span
                            className={`badge${u.status === "disabled" ? " badge-withdrawn" : ""}`}
                          >
                            {APPROVAL_STATUS_LABELS[u.status]}
                          </span>
                        </td>
                        <td>
                          {u.status === "pending" ? (
                            <ApproveForm id={u.id} />
                          ) : u.status === "approved" ? (
                            <StatusForm
                              id={u.id}
                              status="disabled"
                              label="غیر فعال کریں"
                            />
                          ) : (
                            <StatusForm
                              id={u.id}
                              status="approved"
                              label="دوبارہ فعال کریں"
                              primary
                            />
                          )}
                          {u.status === "approved" &&
                          u.assigned_role !== "super_admin" ? (
                            <span style={{ marginInlineStart: "6px" }}>
                              <PromoteAdminForm id={u.id} />
                            </span>
                          ) : null}
                          {u.status === "approved" &&
                          u.assigned_role === "super_admin" &&
                          primary &&
                          u.assigned_madrasa_id !== mine?.madrasaId ? (
                            <span style={{ marginInlineStart: "6px" }}>
                              <DemoteAdminForm id={u.id} />
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="form-note">
              منظور شدہ صارف کا profile اگلے لاگ اِن پر خود بن جائے گا۔ صارف کا
              ریکارڈ کبھی حذف نہیں ہوتا — رسائی بند کرنی ہو تو «غیر فعال» کریں۔
              «ایڈمن بنائیں» سے دوسرا ایڈمن بنتا ہے — وہ صارفین منظور کر سکے
              گا مگر آپ کا ڈیٹا نہیں دیکھ سکے گا؛ ایڈمن ختم کرنا صرف پہلا
              ایڈمن کر سکتا ہے۔
            </p>

            <h3 className="form-section-title">مہمان رسائی (ڈیمو)</h3>
            {guestTableMissing ? (
              <p className="empty-state">
                مہمان کی میز ابھی نہیں بنی — پہلے مرحلہ 67 کی SQL چلائیں۔
              </p>
            ) : (
              <>
                <GuestSettingsForm
                  allowGuests={guestSettings?.allow_guests ?? false}
                  guestHours={guestSettings?.guest_hours ?? 2}
                />

                {guests.length === 0 ? (
                  <p className="empty-state">ابھی کوئی مہمان نہیں آیا۔</p>
                ) : (
                  <div className="tbl-wrap">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>نام</th>
                          <th>بنا</th>
                          <th>ختم ہوگا</th>
                          <th>حالت</th>
                          <th>کارروائی</th>
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
                                  {expired ? "ختم" : "فعال"}
                                </span>
                              </td>
                              <td>
                                {expired ? (
                                  <DeleteGuestForm id={g.id} />
                                ) : (
                                  <CloseGuestForm id={g.id} />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="form-note">
                  بند کرنا = رسائی بند؛ مہمان کا ڈیٹا رہتا ہے — صفائی الگ
                  کام ہے۔
                </p>
              </>
            )}

            <h3 className="form-section-title">
              Gmail بدلنا (مدرسے کی منتقلی)
            </h3>
            <p className="form-note">
              اگر کسی مدرسے کے مالک کی Gmail کھو جائے تو اس کا مدرسہ نئی
              Gmail پر منتقل کریں — ڈیٹا وہی رہے گا۔ پہلے آزمائشی کھاتے
              پر جانچیں (مرحلہ 82)۔
            </p>
            <TransferWorkspaceForm />
          </>
        )}
      </div>
    </div>
  );
}
