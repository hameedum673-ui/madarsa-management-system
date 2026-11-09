/**
 * مرحلہ 11 — صارفین اور اکاؤنٹس: ایڈمن کنٹرول (صرف ایڈمن دیکھ سکتا ہے)
 * منظور شدہ / زیرِ منظوری / غیر فعال — منظوری، معطلی اور دوبارہ فعال کرنا۔
 * منظوری کے وقت کردار چنا جاتا ہے؛ صارف کا profile اگلے لاگ اِن پر خود بنتا ہے۔
 * میز ابھی نہ بنی ہو (migration 009 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  APPROVAL_STATUS_LABELS,
  ROLE_LABELS,
  isAppAdmin,
  type ApprovedUser,
} from "@/lib/approval";
import {
  AddUserForm,
  ApproveForm,
  StatusForm,
} from "@/app/departments/users/UserForms";

export default async function UsersPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    notFound();
  }

  const { data, error } = await supabase
    .from("approved_users")
    .select("*")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as ApprovedUser[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";

  const pending = users.filter((u) => u.status === "pending");

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>صارفین اور اکاؤنٹس</h2>
          <span className="page-count">
            کل: {users.length.toLocaleString("ur-PK")} — زیرِ منظوری:{" "}
            {pending.length.toLocaleString("ur-PK")}
          </span>
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
            </p>
          </>
        )}
      </div>
    </div>
  );
}
