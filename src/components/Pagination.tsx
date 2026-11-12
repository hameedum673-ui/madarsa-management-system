import Link from "next/link";

type PageParams = Record<string, string | string[] | undefined>;

/**
 * مرحلہ 58 — صفحہ بندی کے بٹن (سرور جزو)۔
 * موجودہ فلٹر (تلاش، شعبہ، مہینہ…) برقرار رکھتے ہوئے صفحہ بدلتا ہے۔
 * ایک ہی صفحہ ہو تو کچھ نہیں دکھاتا۔
 */
export default function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: PageParams;
}) {
  if (totalPages <= 1) return null;

  const hrefFor = (p: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => q.append(key, v));
      else q.set(key, value);
    }
    q.set("page", String(p));
    return `?${q.toString()}`;
  };

  // موجودہ صفحے کے آس پاس زیادہ سے زیادہ 5 صفحے دکھائیں
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages: number[] = [];
  for (let p = start; p <= end; p++) pages.push(p);

  return (
    <div className="pagination">
      <span className="page-count">
        صفحہ {page.toLocaleString("ur-PK")} از{" "}
        {totalPages.toLocaleString("ur-PK")}
      </span>
      {page > 1 ? (
        <Link className="btn-ghost" href={hrefFor(page - 1)}>
          پچھلا
        </Link>
      ) : null}
      {pages.map((p) => (
        <Link
          key={p}
          className={p === page ? "btn-primary" : "btn-ghost"}
          href={hrefFor(p)}
        >
          {p.toLocaleString("ur-PK")}
        </Link>
      ))}
      {page < totalPages ? (
        <Link className="btn-ghost" href={hrefFor(page + 1)}>
          اگلا
        </Link>
      ) : null}
    </div>
  );
}
