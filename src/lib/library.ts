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

/**
 * مرحلہ 101 — کتاب دینا اور واپس لینا
 * لینے والا: طالبہ / استاد / عملہ۔ حالت: دی ہوئی / واپس آ گئی (حذف کبھی نہیں)۔
 */
export type BorrowerType = "student" | "teacher" | "staff";
export type IssueStatus = "issued" | "returned";

export const BORROWER_TYPES: BorrowerType[] = ["student", "teacher", "staff"];

export const BORROWER_TYPE_LABELS: Record<BorrowerType, string> = {
  student: "طالبہ",
  teacher: "استاد",
  staff: "عملہ",
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  issued: "دی ہوئی",
  returned: "واپس آ گئی",
};

export interface LibraryIssue {
  id: string;
  madrasa_id: string;
  book_id: string;
  borrower_type: BorrowerType;
  borrower_id: string;
  issued_at: string;
  due_date: string | null;
  returned_at: string | null;
  status: IssueStatus;
  created_by: string | null;
  created_at: string;
}

/** لینے والے کا نام + پہچان (طالبہ: رجسٹریشن نمبر؛ استاد/عملہ: عہدہ) */
export interface BorrowerRef {
  id: string;
  name: string;
  detail: string;
}

type ServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").createClient>
>;

/** کسی کتاب کے دیے ہوئے (واپس نہ آئے) نسخے گنیں — میز نہ بنی ہو تو missing سچ */
export async function countActiveIssues(
  supabase: ServerClient,
  bookId: string,
): Promise<{ count: number; missing: boolean }> {
  const { count, error } = await supabase
    .from("library_issues")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("status", "issued");
  if (error) {
    if ((error as { code?: string }).code === "42P01") {
      return { count: 0, missing: true };
    }
    throw error;
  }
  return { count: count ?? 0, missing: false };
}

/** دی ہوئی کتابوں کے لینے والوں کے نام ایک ساتھ لائیں (تین میزوں سے) */
export async function resolveBorrowerNames(
  supabase: ServerClient,
  issues: Pick<LibraryIssue, "borrower_type" | "borrower_id">[],
): Promise<Map<string, BorrowerRef>> {
  const found = new Map<string, BorrowerRef>();
  const byType = new Map<BorrowerType, string[]>();
  for (const issue of issues) {
    const list = byType.get(issue.borrower_type) ?? [];
    if (!list.includes(issue.borrower_id)) list.push(issue.borrower_id);
    byType.set(issue.borrower_type, list);
  }

  const studentIds = byType.get("student") ?? [];
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from("students")
      .select("id, name, registration_number")
      .in("id", studentIds);
    for (const row of (data ?? []) as {
      id: string;
      name: string;
      registration_number: string;
    }[]) {
      found.set(row.id, {
        id: row.id,
        name: row.name,
        detail: row.registration_number,
      });
    }
  }

  for (const type of ["teacher", "staff"] as const) {
    const ids = byType.get(type) ?? [];
    if (ids.length === 0) continue;
    const { data } = await supabase
      .from(type === "teacher" ? "teachers" : "staff")
      .select("id, name, position")
      .in("id", ids);
    for (const row of (data ?? []) as {
      id: string;
      name: string;
      position: string | null;
    }[]) {
      found.set(row.id, {
        id: row.id,
        name: row.name,
        detail: row.position ?? "",
      });
    }
  }

  return found;
}
