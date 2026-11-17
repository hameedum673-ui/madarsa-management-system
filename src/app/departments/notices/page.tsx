/**
 * مرحلہ 27 — اطلاعات اور اعلانات کی فہرست (سرور)
 * قسم کا فلٹر (پہلے شعبہ چنیں، پھر "دکھائیں" دبائیں)۔
 * میز ابھی نہ بنی ہو (migration 020 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  NOTICE_KINDS,
  type Notice,
} from "@/lib/notices";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const params = await searchParams;
  const kind = params.kind ?? "all";
  const kindValid = kind === "all" || NOTICE_KINDS.includes(kind as (typeof NOTICE_KINDS)[number]);

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("notices")
    .select("*", { count: "exact" })
    .order("notice_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (kindValid && kind !== "all") {
    query = query.eq("kind", kind);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  const notices = (data ?? []) as Notice[];
  const pages = pageCount(count);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "notices.title")}</h2>
          <Link className="btn-primary" href="/departments/notices/new">
            {t(lang, "notices.new")}
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "notices.table_missing")}</p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">{t(lang, "col.type")}</span>
                <select
                  className="field-input"
                  name="kind"
                  defaultValue={kindValid ? kind : "all"}
                >
                  <option value="all">{t(lang, "common.all")}</option>
                  {NOTICE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {t(lang, `notice.kind.${k}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                {t(lang, "common.show")}
              </button>
            </form>

            <p className="sub">{t(lang, "notices.filter_note")}</p>

            {notices.length === 0 ? (
              <p className="empty-state">{t(lang, "notices.empty")}</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "notices.col_title")}</th>
                    <th>{t(lang, "col.type")}</th>
                    <th>{t(lang, "col.date")}</th>
                    <th>{t(lang, "col.status")}</th>
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
                      <td>{t(lang, `notice.kind.${n.kind}`)}</td>
                      <td>{formatDate(n.notice_date)}</td>
                      <td>
                        <span className="badge">
                          {t(lang, `library.status.${n.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        <Pagination page={page} totalPages={pages} params={params} lang={lang} />
      </div>
    </div>
  );
}
