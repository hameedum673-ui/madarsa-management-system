/**
 * مرحلہ 28 — دستاویزات کی فہرست (سرور)
 * قسم کا فلٹر (پہلے قسم چنیں، پھر "دکھائیں" دبائیں)۔
 * میعاد گزر چکی ہو تو "میعاد ختم" کا نشان خودبخود دکھایا جاتا ہے۔
 * میز ابھی نہ بنی ہو (migration 021 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  DOCUMENT_TYPES,
  isExpired,
  type MadrasaDocument,
} from "@/lib/documents";
import { todayInKarachi } from "@/lib/attendance";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const params = await searchParams;
  const type = params.type ?? "all";
  const typeValid =
    type === "all" ||
    DOCUMENT_TYPES.includes(type as (typeof DOCUMENT_TYPES)[number]);

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (typeValid && type !== "all") {
    query = query.eq("doc_type", type);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  const documents = (data ?? []) as MadrasaDocument[];
  const pages = pageCount(count);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";
  const today = todayInKarachi();

  const lang = await langP;

  // مرحلہ 41 — کن دستاویزات کے ساتھ فائل لگی ہے (میز نہ ہو تو کوئی نشان نہیں)
  const docsWithFiles = new Set<string>();
  try {
    const { data: filesData } = await supabase
      .from("document_files")
      .select("document_id")
      .eq("status", "active");
    for (const r of (filesData ?? []) as { document_id: string }[]) {
      docsWithFiles.add(r.document_id);
    }
  } catch {
    /* میز نہ ہو تو کوئی نشان نہیں دکھایا جاتا */
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "docs.title")}</h2>
          <Link className="btn-primary" href="/departments/documents/new">
            {t(lang, "docs.new")}
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "docs.table_missing")}</p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">{t(lang, "col.type")}</span>
                <select
                  className="field-input"
                  name="type"
                  defaultValue={typeValid ? type : "all"}
                >
                  <option value="all">{t(lang, "common.all")}</option>
                  {DOCUMENT_TYPES.map((ty) => (
                    <option key={ty} value={ty}>
                      {t(lang, `doc.type.${ty}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                {t(lang, "common.show")}
              </button>
            </form>

            <p className="sub">{t(lang, "notices.filter_note")}</p>

            {documents.length === 0 ? (
              <p className="empty-state">{t(lang, "docs.empty")}</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "notices.col_title")}</th>
                    <th>{t(lang, "col.type")}</th>
                    <th>{t(lang, "docs.col_expiry")}</th>
                    <th>{t(lang, "col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/departments/documents/${d.id}`}>
                          {d.title}
                        </Link>
                        {docsWithFiles.has(d.id) ? (
                          <>
                            {" "}
                            <span className="badge">{t(lang, "docs.file_badge")}</span>
                          </>
                        ) : null}
                      </td>
                      <td>{t(lang, `doc.type.${d.doc_type}`)}</td>
                      <td>
                        {formatDate(d.expiry_date)}
                        {isExpired(d, today)
                          ? ` — ${t(lang, "doc.status.expired")}`
                          : ""}
                      </td>
                      <td>
                        <span className="badge">
                          {t(lang, `doc.status.${d.status}`)}
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
