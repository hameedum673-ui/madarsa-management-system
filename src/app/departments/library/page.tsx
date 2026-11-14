/**
 * مرحلہ 100 — کتابوں کی فہرست (سرور)
 * نام / مصنف سے تلاش اور قسم کا فلٹر (پہلے چنیں، پھر "دکھائیں" دبائیں)۔
 * میز ابھی نہ بنی ہو (migration 052 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  BOOK_CATEGORIES,
  type LibraryBook,
} from "@/lib/library";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const params = await searchParams;
  const q = (params.q ?? "").trim().replace(/[%_]/g, "").slice(0, 100);
  const category = params.category ?? "all";
  const categoryValid =
    category === "all" ||
    BOOK_CATEGORIES.includes(category as (typeof BOOK_CATEGORIES)[number]);

  // مرحلہ 58 — صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
  const page = parsePage(params.page);
  const { from, to } = pageRange(page);

  let query = supabase
    .from("library_books")
    .select("*", { count: "exact" })
    .order("title", { ascending: true })
    .order("created_at", { ascending: false });
  if (q) {
    query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`);
  }
  if (categoryValid && category !== "all") {
    query = query.eq("category", category);
  }

  query = query.range(from, to);
  const { data, error, count } = await query;
  const books = (data ?? []) as LibraryBook[];
  const pages = pageCount(count);
  const tableMissing = (error as { code?: string } | null)?.code === "42P01";
  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "module.library")}</h2>
          <Link className="btn-ghost" href="/departments/library/issues">
            {t(lang, "library.issued_title")}
          </Link>
          <Link className="btn-primary" href="/departments/library/new">
            {t(lang, "library.add")}
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">{t(lang, "library.table_missing")}</p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">
                  {t(lang, "library.search_label")}
                </span>
                <input
                  className="field-input"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder={t(lang, "library.form.title_ph")}
                />
              </label>
              <label className="field">
                <span className="field-label">{t(lang, "col.type")}</span>
                <select
                  className="field-input"
                  name="category"
                  defaultValue={categoryValid ? category : "all"}
                >
                  <option value="all">{t(lang, "common.all")}</option>
                  {BOOK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(lang, `library.cat.${c}`)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                {t(lang, "common.show")}
              </button>
            </form>

            <p className="sub">{t(lang, "library.hint")}</p>

            {books.length === 0 ? (
              <p className="empty-state">{t(lang, "library.empty")}</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t(lang, "library.col.title")}</th>
                    <th>{t(lang, "library.col.author")}</th>
                    <th>{t(lang, "col.type")}</th>
                    <th>{t(lang, "library.col.quantity")}</th>
                    <th>{t(lang, "library.col.shelf")}</th>
                    <th>{t(lang, "col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/departments/library/${b.id}`}>
                          {b.title}
                        </Link>
                      </td>
                      <td>{b.author ?? "—"}</td>
                      <td>{t(lang, `library.cat.${b.category}`)}</td>
                      <td>{b.quantity}</td>
                      <td>{b.shelf ?? "—"}</td>
                      <td>
                        <span className="badge">
                          {t(lang, `library.status.${b.status}`)}
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
