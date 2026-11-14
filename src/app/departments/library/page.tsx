/**
 * مرحلہ 100 — کتابوں کی فہرست (سرور)
 * نام / مصنف سے تلاش اور قسم کا فلٹر (پہلے چنیں، پھر "دکھائیں" دبائیں)۔
 * میز ابھی نہ بنی ہو (migration 052 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { parsePage, pageRange, pageCount } from "@/lib/pagination";
import Pagination from "@/components/Pagination";
import {
  BOOK_CATEGORIES,
  BOOK_CATEGORY_LABELS,
  BOOK_STATUS_LABELS,
  type LibraryBook,
} from "@/lib/library";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const supabase = await createClient();
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

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>لائبریری</h2>
          <Link className="btn-primary" href="/departments/library/new">
            نئی کتاب لکھیں
          </Link>
        </div>

        {tableMissing ? (
          <p className="empty-state">
            لائبریری کی میز ابھی نہیں بنی — پہلے مرحلہ 100 کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <form className="filter-row" method="get">
              <label className="field">
                <span className="field-label">تلاش (نام یا مصنف)</span>
                <input
                  className="field-input"
                  type="search"
                  name="q"
                  defaultValue={q}
                  placeholder="مثلاً تفسیر ابن کثیر"
                />
              </label>
              <label className="field">
                <span className="field-label">قسم</span>
                <select
                  className="field-input"
                  name="category"
                  defaultValue={categoryValid ? category : "all"}
                >
                  <option value="all">سب</option>
                  {BOOK_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {BOOK_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-primary" type="submit">
                دکھائیں
              </button>
            </form>

            <p className="sub">
              پہلے اوپر والے خانوں میں تلاش یا قسم چنیں، پھر "دکھائیں"
              دبائیں — اگر "سب" چنا ہو اور تلاش خالی ہو تو "دکھائیں" دبانے
              سے فہرست ویسے ہی رہے گی۔
            </p>

            {books.length === 0 ? (
              <p className="empty-state">ابھی کوئی کتاب درج نہیں ہے۔</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>کتاب کا نام</th>
                    <th>مصنف</th>
                    <th>قسم</th>
                    <th>تعداد</th>
                    <th>الماری/جگہ</th>
                    <th>حالت</th>
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
                      <td>{BOOK_CATEGORY_LABELS[b.category]}</td>
                      <td>{b.quantity}</td>
                      <td>{b.shelf ?? "—"}</td>
                      <td>
                        <span className="badge">
                          {BOOK_STATUS_LABELS[b.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        <Pagination page={page} totalPages={pages} params={params} />
      </div>
    </div>
  );
}
