/**
 * مرحلہ 27 — اطلاعات اور اعلانات کی فہرست (سرور)
 * قسم کا فلٹر (پہلے شعبہ چنیں، پھر "دکھائیں" دبائیں)۔
 * میز ابھی نہ بنی ہو (migration 020 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import {
  NOTICE_KINDS,
  NOTICE_KIND_LABELS,
  NOTICE_STATUS_LABELS,
  type Notice,
} from "@/lib/notices";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const kind = params.kind ?? "all";
  const kindValid = kind === "all" || NOTICE_KINDS.includes(kind as (typeof NOTICE_KINDS)[number]);

  let query = supabase
    .from("notices")
    .select("*")
    .order("notice_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (kindValid && kind !== "all") {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;
  const notices = (data ?? []) as Notice[];
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>اطلاعات اور اعلانات</h2>
          <Link className="btn-primary" href="/departments/notices/new">
            نئی اطلاع لکھیں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            اطلاعات کی میز ابھی نہیں بنی — پہلے مرحلہ 27 کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">قسم</span>
                <select
                  className="field-input"
                  name="kind"
                  defaultValue={kindValid ? kind : "all"}
                >
                  <option value="all">سب</option>
                  {NOTICE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {NOTICE_KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                دکھائیں
              </button>
            </form>

            <p className="sub">
              پہلے اوپر والے خانے میں قسم چنیں، پھر "دکھائیں" دبائیں — اگر
              "سب" چنا ہو تو "دکھائیں" دبانے سے فہرست ویسے ہی رہے گی۔
            </p>

            {notices.length === 0 ? (
              <p className="empty-state">ابھی کوئی اطلاع درج نہیں ہے۔</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>عنوان</th>
                    <th>قسم</th>
                    <th>تاریخ</th>
                    <th>حالت</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((n) => (
                    <tr key={n.id}>
                      <td>
                        <Link href={`/departments/notices/${n.id}`}>
                          {n.title}
                        </Link>
                      </td>
                      <td>{NOTICE_KIND_LABELS[n.kind]}</td>
                      <td>{formatDate(n.notice_date)}</td>
                      <td>
                        <span className="badge">
                          {NOTICE_STATUS_LABELS[n.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
