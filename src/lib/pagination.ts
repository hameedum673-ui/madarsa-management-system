/**
 * مرحلہ 58 — فہرستوں کی صفحہ بندی (ہر صفحے پر 20 ریکارڈ)
 * اور تلاش کے لفظ کی صفائی (مرحلہ 34 والا طریقہ)۔
 */
export const PAGE_SIZE = 20;

/** URL میں صفحہ نمبر غلط ہو تو پہلا صفحہ */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** صفحے کے ریکارڈوں کی حد (Supabase .range کے لیے) */
export function pageRange(page: number): { from: number; to: number } {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}

/** کل ریکارڈوں سے کل صفحوں کی تعداد */
export function pageCount(total: number | null): number {
  return Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
}

/** تلاش کا لفظ صاف کریں تاکہ ڈیٹا بیس کی تلاش نہ ٹوٹے (%, _ اور , ہٹا دیں) */
export function sanitizeSearch(raw: string): string {
  return raw.replace(/[%_,\\]/g, " ").replace(/\s+/g, " ").trim();
}
