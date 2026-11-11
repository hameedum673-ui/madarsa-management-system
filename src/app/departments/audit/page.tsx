/**
 * مرحلہ 35 — سرگرمیوں کا ریکارڈ (آڈٹ لاگ دیکھنا)
 * صرف ایڈمن دیکھ سکتا ہے۔ تازہ ترین 100 ریکارڈ، نئے سے پرانے کی ترتیب میں۔
 * کس نے کیا — نام profiles سے لایا جاتا ہے (audit_log.user_id صرف
 * شناختی نمبر ہوتا ہے)۔
 * ڈیش بورڈ پر کوئی نیا بٹن نہیں — اس صفحے کا لنک صارفین والے صفحے پر ہے۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_CATEGORIES,
  summarizeDetails,
  type AuditCategoryId,
  type AuditLogRow,
} from "@/lib/audit";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("ur-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    notFound();
  }

  const sp = await searchParams;
  const category = (AUDIT_CATEGORIES.some((c) => c.id === sp.category)
    ? sp.category
    : "all") as AuditCategoryId;
  const selected = AUDIT_CATEGORIES.find((c) => c.id === category);
  const actionFilter = selected?.actions ?? null;

  let query = supabase
    .from("audit_log")
    .select("id, user_id, action, details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (actionFilter) {
    query = query.in("action", actionFilter);
  }
  const { data, error } = await query;

  const rows = (data ?? []) as AuditLogRow[];

  // کس نے کیا — نام profiles سے (صرف اس مدرسے کے صارفین)
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  let namesById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, name")
      .in("id", userIds);
    namesById = new Map(
      ((profiles ?? []) as { id: string; name: string }[]).map((p) => [
        p.id,
        p.name,
      ]),
    );
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>سرگرمیوں کا ریکارڈ</h2>
          <span className="page-count">
            تازہ {rows.length.toLocaleString("ur-PK")} ریکارڈ
          </span>
          <span className="spacer" />
          <Link className="btn-ghost" href="/departments/users">
            صارفین پر واپس جائیں
          </Link>
        </div>

        <form
          method="get"
          action="/departments/audit"
          className="att-controls"
        >
          <label className="field">
            <span className="field-label">کام کی قسم</span>
            <select
              className="field-input"
              name="category"
              defaultValue={category}
            >
              {AUDIT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary" type="submit">
            دکھائیں
          </button>
        </form>
        <p className="sub">
          پہلے اوپر والے خانے میں کام کی قسم چنیں، پھر &quot;دکھائیں&quot;
          دبائیں۔
        </p>

        {error ? (
          <p className="empty-state">ریکارڈ نہیں کھل سکا — دوبارہ کوشش کریں۔</p>
        ) : rows.length === 0 ? (
          <p className="empty-state">
            اس قسم کا کوئی ریکارڈ نہیں ہے — ابھی کوئی تبدیلی درج نہیں ہوئی۔
          </p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>تاریخ اور وقت</th>
                  <th>کس نے</th>
                  <th>کام</th>
                  <th>تفصیل</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.created_at)}</td>
                    <td>
                      {r.user_id ? (namesById.get(r.user_id) ?? "—") : "—"}
                    </td>
                    <td>{AUDIT_ACTION_LABELS[r.action] ?? r.action}</td>
                    <td>{summarizeDetails(r.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
