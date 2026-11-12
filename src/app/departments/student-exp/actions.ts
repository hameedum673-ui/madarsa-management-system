/**
 * مرحلہ 22 — طلبہ کے اخراجات کے Server Actions (اضافہ / منسوخی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف منسوخ ہوتا ہے (فیس والا ہی اصول)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
  MODULE_DENIED_ERROR,
} from "@/lib/permissions";
import { getMyMadrasa,
  type SectionId,
} from "@/lib/students";
import {
  CLOSED_MONTH_ERROR,
  isMonthClosed,
  monthOfDate,
} from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import {
  STUDENT_EXPENSE_CATEGORIES,
  type StudentExpenseCategory,
} from "@/lib/studentExpenses";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface ExpenseFields {
  studentId: string;
  category: StudentExpenseCategory;
  amount: number;
  expenseDate: string;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: ExpenseFields } | { error: string } {
  const studentId = clean(formData.get("student_id"), 50);
  const category = clean(formData.get("category"), 20);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const expenseDate = clean(formData.get("expense_date"), 10);
  const note = clean(formData.get("note"), 500);

  if (!studentId) return { error: "طالبہ منتخب کریں۔" };
  if (!STUDENT_EXPENSE_CATEGORIES.includes(category as StudentExpenseCategory))
    return { error: "قسم درست منتخب کریں (کتابیں، کپڑے، علاج، کھانا یا دیگر)۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate))
    return { error: "تاریخ درست شکل میں لکھیں۔" };
  if (expenseDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };

  return {
    fields: {
      studentId,
      category: category as StudentExpenseCategory,
      amount,
      expenseDate,
      note,
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

/** نیا خرچ — ریکارڈ نمبر خودکار (SE-0001…) */
export async function addStudentExpense(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "student-exp"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کا خرچ درج نہیں ہو سکتا
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.expenseDate))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // طالبہ اسی مدرسے کی اور فعال ہونی چاہیے
  const { data: student } = await supabase
    .from("students")
    .select("id, section")
    .eq("id", f.studentId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .single();
  if (!student) return { error: "طالبہ نہیں ملی — فعال طالبہ منتخب کریں۔" };
  // مرحلہ 54 — بند شعبے کی طالبہ کا خرچ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      ((student as { section?: string | null }).section ?? "banat") as SectionId,
    )
  )
    return { error: "اس شعبے کی طالبہ کا خرچ درج کرنے کی اجازت نہیں ہے۔" };

  // ریکارڈ نمبر: اس مدرسے کے طلبہ کے اخراجات کی گنتی + 1
  const { count } = await supabase
    .from("student_expenses")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const recordNumber = `SE-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("student_expenses")
    .insert({
      madrasa_id: mine.madrasaId,
      student_id: f.studentId,
      record_number: recordNumber,
      category: f.category,
      amount: f.amount,
      expense_date: f.expenseDate,
      note: f.note || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    // ریکارڈ نمبر دو بار بن جائے تو صاف غلطی
    if ((error as { code?: string } | null)?.code === "23505") {
      return { error: "ریکارڈ نمبر دو بار بن گیا — دوبارہ کوشش کریں۔" };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "student_expense_created",
    {
      student_expense_id: data.id as string,
      record_number: recordNumber,
      category: f.category,
    },
  );

  revalidatePath("/departments/student-exp");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط اندراج منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidStudentExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "student-exp"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کا خرچ منسوخ نہیں ہو سکتا
  const { data: row } = await supabase
    .from("student_expenses")
    .select("expense_date")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .maybeSingle();
  if (
    row &&
    (await isMonthClosed(
      supabase,
      mine.madrasaId,
      monthOfDate(row.expense_date as string),
    ))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  const { data, error } = await supabase
    .from("student_expenses")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, record_number")
    .single();

  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا — شاید یہ اندراج پہلے سے منسوخ ہے۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "student_expense_voided",
    {
      student_expense_id: data.id as string,
      record_number: data.record_number as string,
    },
  );

  revalidatePath("/departments/student-exp");
  revalidatePath(`/departments/student-exp/${id}`);
  revalidatePath("/");
  return { ok: true };
}
