import Link from "next/link";
import { t, type Lang } from "@/i18n/dictionary";

type PageParams = Record<string, string | string[] | undefined>;

/**
 * مرحلہ 58 — صفحہ بندی کے بٹن (سرور جزو)۔
 * موجودہ فلٹر (تلاش، شعبہ، مہینہ…) برقرار رکھتے ہوئے صفحہ بدلتا ہے۔
 * ایک ہی صفحہ ہو تو کچھ نہیں دکھاتا۔
 * مرحلہ 103 — زبان نہ دی جائے تو اردو (دوسرے ماڈیول ویسے ہی رہتے ہیں)۔
 */
export default function Pagination({
  page,
  totalPages,
  params,
  lang = "ur",
}: {
  page: number;
  totalPages: number;
  params: PageParams;
  lang?: Lang;
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
        {t(lang, "pagination.page", {
          p: page.toLocaleString("ur-PK"),
          total: totalPages.toLocaleString("ur-PK"),
        })}
      </span>
      {page > 1 ? (
        <Link className="btn-ghost" href={hrefFor(page - 1)}>
          {t(lang, "pagination.prev")}
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
          {t(lang, "pagination.next")}
        </Link>
      ) : null}
    </div>
  );
}
