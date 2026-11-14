/**
 * مرحلہ 100 — لائبریری کے Server Actions (اضافہ / تبدیلی / محفوظ)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * کتاب کبھی حذف نہیں ہوتی — غلط کتاب محفوظ (archive) کی جاتی ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe, MODULE_DENIED_ERROR } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import {
  BOOK_CATEGORIES,
  type BookCategory,
  type BookStatus,
} from "@/lib/library";

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

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: BookFields } | { error: string } {
  const title = clean(formData.get("title"), 200);
  const author = clean(formData.get("author"), 100);
  const category = clean(formData.get("category"), 20);
  const quantityRaw = clean(formData.get("quantity"), 10);
  const shelf = clean(formData.get("shelf"), 100);

  if (!title) return { error: "کتاب کا نام ضروری ہے۔" };
  if (!BOOK_CATEGORIES.includes(category as BookCategory))
    return { error: "قسم درست منتخب کریں (قرآن، تفسیر، حدیث، فقہ یا دیگر)۔" };
  const quantity = quantityRaw === "" ? 1 : Number(quantityRaw);
  if (!Number.isInteger(quantity) || quantity < 0)
    return { error: "تعداد درست لکھیں (0 یا زیادہ)۔" };

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
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: MODULE_DENIED_ERROR };
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
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
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
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "archived")
    return { error: "حالت درست منتخب کریں (فعال یا محفوظ شدہ)۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: MODULE_DENIED_ERROR };
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
    return { error: "تبدیلی محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
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
export async function archiveBook(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "library"))) {
    return { error: MODULE_DENIED_ERROR };
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
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
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
