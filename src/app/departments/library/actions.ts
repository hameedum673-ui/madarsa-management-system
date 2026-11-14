/**
 * مرحلہ 100 — لائبریری کے Server Actions (اضافہ / تبدیلی / محفوظ)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * کتاب کبھی حذف نہیں ہوتی — غلط کتاب محفوظ (archive) کی جاتی ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import { isLang, t, type Lang } from "@/i18n/dictionary";
import {
  todayInKarachi,
  isValidPastOrTodayDate,
} from "@/lib/attendance";
import {
  BOOK_CATEGORIES,
  BORROWER_TYPES,
  type BookCategory,
  type BookStatus,
  type BorrowerType,
} from "@/lib/library";

/** مرحلہ 108 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface BookFields {
  title: string;
  author: string;
  category: BookCategory;
  quantity: number;
  shelf: string;
}

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
  lang: Lang,
): { fields: BookFields } | { error: string } {
  const title = clean(formData.get("title"), 200);
  const author = clean(formData.get("author"), 100);
  const category = clean(formData.get("category"), 20);
  const quantityRaw = clean(formData.get("quantity"), 10);
  const shelf = clean(formData.get("shelf"), 100);

  if (!title) return { error: t(lang, "library.err.title_required") };
  if (!BOOK_CATEGORIES.includes(category as BookCategory))
    return { error: t(lang, "library.err.category_invalid") };
  const quantity = quantityRaw === "" ? 1 : Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity < 0)
    return { error: t(lang, "library.err.quantity_invalid") };

  return {
    fields: {
      title,
      author,
      category: category as BookCategory,
      quantity,
      shelf,
    },
  };
}

/** آڈٹ لاگ میں اندراج — ناکام ہو تو اصل کام نہیں رکتا */
async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  madrasaId: string,
  userId: string,
  action: string,
  details: Record<string, string>,
) {
  try {
    await supabase.from("audit_log").insert({
      madrasa_id: madrasaId,
      user_id: userId,
      action,
      details,
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }
}

/** نئی کتاب شامل کریں */
export async function addBook(formData: FormData): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("library_books")
    .insert({
      madrasa_id: mine.madrasaId,
      title: f.title,
      author: f.author || null,
      category: f.category,
      quantity: f.quantity,
      shelf: f.shelf || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "student.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "book_created", {
    book_id: data.id as string,
    title: f.title,
  });

  revalidatePath("/departments/library");
  revalidatePath("/");
  return { ok: true };
}

/** کتاب تبدیل کریں — مدرسہ کبھی نہیں بدلتا */
export async function updateBook(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "archived")
    return { error: t(lang, "library.err.status_invalid") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // RLS خود یقین دلاتی ہے کہ یہ کتاب اسی مدرسے کی ہے
  const { data, error } = await supabase
    .from("library_books")
    .update({
      title: f.title,
      author: f.author || null,
      category: f.category,
      quantity: f.quantity,
      shelf: f.shelf || null,
      status: status as BookStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "library.err.update_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "book_updated", {
    book_id: data.id as string,
    title: f.title,
  });

  revalidatePath("/departments/library");
  revalidatePath(`/departments/library/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** کتاب محفوظ کریں (archive) — حذف نہیں ہوتی، ریکارڈ رہتا ہے */
export async function archiveBook(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("library_books")
    .update({
      status: "archived" as BookStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, title")
    .single();

  if (error || !data) {
    return { error: t(lang, "student.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "book_archived", {
    book_id: data.id as string,
    title: (data as { title: string }).title,
  });

  revalidatePath("/departments/library");
  revalidatePath(`/departments/library/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/** تاریخ درست ہے (YYYY-MM-DD، حقیقی دن)؟ */
function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00");
  return !Number.isNaN(d.getTime());
}

/** کتاب دیں — دستیابی سرور پر جانچی جاتی ہے (نسخے ختم ہوں تو انکار) */
export async function issueBook(
  bookId: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const borrowerType = clean(formData.get("borrower_type"), 20);
  const borrowerId = clean(formData.get("borrower_id"), 50);
  const issuedRaw = clean(formData.get("issued_at"), 10);
  const dueRaw = clean(formData.get("due_date"), 10);

  if (!BORROWER_TYPES.includes(borrowerType as BorrowerType))
    return { error: t(lang, "library.err.borrower_type_invalid") };
  if (!borrowerId)
    return { error: t(lang, "library.err.borrower_required") };
  const issuedAt = issuedRaw === "" ? todayInKarachi() : issuedRaw;
  if (!isValidPastOrTodayDate(issuedAt))
    return { error: t(lang, "library.err.issued_date_invalid") };
  const dueDate = dueRaw === "" ? null : dueRaw;
  if (dueDate !== null && !isValidDate(dueDate))
    return { error: t(lang, "library.err.due_date_invalid") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // کتاب اسی مدرسے کی ہو اور فعال ہو
  const { data: book, error: bookError } = await supabase
    .from("library_books")
    .select("id, title, quantity, status")
    .eq("id", bookId)
    .eq("madrasa_id", mine.madrasaId)
    .single();
  if (bookError || !book)
    return { error: t(lang, "library.err.book_not_found") };
  if ((book as { status: string }).status !== "active")
    return { error: t(lang, "library.err.archived") };

  // لینے والا اسی مدرسے کا ہو (قسم کے مطابق میز سے جانچ)
  const borrowerTable =
    borrowerType === "student"
      ? "students"
      : borrowerType === "teacher"
        ? "teachers"
        : "staff";
  const { data: borrower } = await supabase
    .from(borrowerTable)
    .select("id")
    .eq("id", borrowerId)
    .eq("madrasa_id", mine.madrasaId)
    .maybeSingle();
  if (!borrower)
    return { error: t(lang, "library.err.borrower_not_found") };

  // دستیابی: دیے ہوئے نسخے کل تعداد سے کم ہوں
  const { count, error: countError } = await supabase
    .from("library_issues")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("status", "issued");
  if (countError) {
    return { error: t(lang, "student.err.save_failed") };
  }
  if ((count ?? 0) >= (book as { quantity: number }).quantity) {
    return { error: t(lang, "library.err.unavailable") };
  }

  const { data, error } = await supabase
    .from("library_issues")
    .insert({
      madrasa_id: mine.madrasaId,
      book_id: bookId,
      borrower_type: borrowerType as BorrowerType,
      borrower_id: borrowerId,
      issued_at: issuedAt,
      due_date: dueDate,
      returned_at: null,
      status: "issued",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "student.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "book_issued", {
    book_id: bookId,
    title: (book as { title: string }).title,
    borrower_type: borrowerType,
    borrower_id: borrowerId,
  });

  revalidatePath("/departments/library");
  revalidatePath(`/departments/library/${bookId}`);
  revalidatePath("/departments/library/issues");
  revalidatePath("/");
  return { ok: true };
}

/** کتاب واپس لکھیں — صرف ابھی دی ہوئی (واپس نہ آئی) کتاب پر */
export async function returnBook(
  issueId: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  const { data, error } = await supabase
    .from("library_issues")
    .update({
      returned_at: new Date().toISOString(),
      status: "returned",
    })
    .eq("id", issueId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "issued")
    .select("id, book_id")
    .single();

  if (error || !data) {
    return {
      error: t(lang, "library.err.return_failed"),
    };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "book_returned", {
    issue_id: data.id as string,
    book_id: (data as { book_id: string }).book_id,
  });

  revalidatePath("/departments/library");
  revalidatePath(
    `/departments/library/${(data as { book_id: string }).book_id}`,
  );
  revalidatePath("/departments/library/issues");
  revalidatePath("/");
  return { ok: true };
}
