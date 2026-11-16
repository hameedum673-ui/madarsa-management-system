/**
 * مرحلہ 21 — فلاحی کام کی فہرست (سرور صفحہ)
 * صرف اپنے مدرسے کا ریکارڈ نظر آتا ہے — RLS پالیسی یہ یقین دلاتی ہے۔
 * کل معاونت صرف فعال اندراجات کی ہے — منسوخ اندراج اس میں نہیں گنا جاتا۔
 * میز ابھی نہ بنی ہو (migration 015 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import { type WelfareRecord } from "@/lib/welfare";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function WelfarePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const lang = await getMyLanguage();
  // مرحلہ 59 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const params = await searchParams;
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);
  const { data, error, count } = await supabase
    .from("welfare_records")
    .select("*, students(name, father_name, registration_number)", { count: "exact" })
    .order("record_date", { ascending: false })
    .order("record_number", { ascending: false })
    .range(from, to);

  const records = (data ?? []) as WelfareRecord[];
  const tableMissing =
    (error as { code?: string } | null)?.code === "42P01";
  const pages = pageCount(count);
  // مرحلہ 59 — کل معاونت — پوری فہرست سے (صرف اس صفحے سے نہیں)
  const { data: totalData } = await supabase
    .from("welfare_records")
    .select("amount")
    .eq("status", "active");
  const totalAid = (totalData ?? []).reduce(
    (sum, r) => sum + ((r as { amount: number }).amount ?? 0),
    0,
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/welfare-expenses" />
          <h2>{t(lang, "welfare.title")}</h2>
          <span className="page-count">
            {t(lang, "welfare.total_aid", {
              total: totalAid.toLocaleString("ur-PK"),
            })}
          </span>
          <span className="spacer" />
          <Link className="btn-primary" href="/departments/welfare/new">
            {t(lang, "welfare.add")}
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "welfare.table_missing")}</p>
        ) : error ? (
          <p className="empty-state">{t(lang, "common.list_error")}</p>
        ) : records.length === 0 ? (
          <p className="empty-state">{t(lang, "welfare.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t(lang, "welfare.col_record")}</th>
                  <th>{t(lang, "col.student")}</th>
                  <th>{t(lang, "col.type")}</th>
                  <th>{t(lang, "col.amount")}</th>
                  <th>{t(lang, "col.date")}</th>
                  <th>{t(lang, "col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/departments/welfare/${r.id}`}>
                        {r.record_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/departments/welfare/${r.id}`}>
                        {r.students?.name ?? "—"}
                      </Link>
                    </td>
                    <td>{t(lang, `welfare.kind.${r.kind}`)}</td>
                    <td>{r.amount.toLocaleString("ur-PK")}</td>
                    <td>{formatDate(r.record_date)}</td>
                    <td>
                      <span
                        className={`badge${r.status === "voided" ? " badge-withdrawn" : ""}`}
                      >
                        {t(lang, `fee.status.${r.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={pages} params={params} lang={lang} />

      </div>
    </div>
  );
}
