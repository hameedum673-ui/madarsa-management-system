/**
 * مرحلہ 100 — لائبریری (کتابوں کا ریکارڈ)
 * قسم: قرآن / تفسیر / حدیث / فقہ / دیگر۔ حالت: فعال / محفوظ شدہ (حذف کبھی نہیں)۔
 */
export type BookCategory = "quran" | "tafsir" | "hadith" | "fiqh" | "other";
export type BookStatus = "active" | "archived";

export const BOOK_CATEGORIES: BookCategory[] = [
  "quran",
  "tafsir",
  "hadith",
  "fiqh",
  "other",
];

export const BOOK_CATEGORY_LABELS: Record<BookCategory, string> = {
  quran: "قرآن",
  tafsir: "تفسیر",
  hadith: "حدیث",
  fiqh: "فقہ",
  other: "دیگر",
};

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  active: "فعال",
  archived: "محفوظ شدہ",
};

export interface LibraryBook {
  id: string;
  madrasa_id: string;
  title: string;
  author: string | null;
  category: BookCategory;
  quantity: number;
  shelf: string | null;
  status: BookStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
