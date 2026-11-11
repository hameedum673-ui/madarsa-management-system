/**
 * مرحلہ 49 — ملا ہوا صفحہ: زکوٰۃ، عشر اور عطیات کی "مد"
 * ایک ہی فارم سے تینوں میزوں میں اندراج ہوتا ہے — مد بتاتی ہے کہ پیسہ
 * کس میز میں جائے گا:
 *   صدقات اور عطیہ → عطیات کی میز (قسم "عطیہ")
 *   زکوٰۃ → زکوٰۃ کی میز (وصولی)
 *   عشر → عشر کی میز (وصولی)
 *   دیگر → عطیات کی میز (قسم "دیگر")
 * تقسیم ختم ہے — زکوٰۃ اور عشر میں صرف وصولی درج ہوتی ہے۔
 */

export type FundCategory = "sadaqah" | "zakat" | "ushr" | "other";

export const FUND_CATEGORIES: FundCategory[] = [
  "sadaqah",
  "zakat",
  "ushr",
  "other",
];

export const FUND_CATEGORY_LABELS: Record<FundCategory, string> = {
  sadaqah: "صدقات اور عطیہ",
  zakat: "زکوٰۃ",
  ushr: "عشر",
  other: "دیگر",
};

/** مد سے شعبے کا نام — اجازت کی جانچ کے لیے */
export const FUND_MODULE: Record<FundCategory, string> = {
  sadaqah: "donations",
  zakat: "zakat",
  ushr: "ushr",
  other: "donations",
};
