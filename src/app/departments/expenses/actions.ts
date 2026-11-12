/**
 * مرحلہ 16 — اخراجات کے Server Actions (اضافہ / منسوخی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط خرچ کبھی حذف نہیں ہوتا — صرف منسوخ ہوتا ہے (فیس والا ہی اصول)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe, MODULE_DENIED_ERROR } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import {
  CLOSED_MONTH_ERROR,
  isMonthClosed,
  monthOfDate,
} from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/fees";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface ExpenseFields {
  title: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: ExpenseFields } | { error: string } {
  const title = clean(formData.get("title"), 200);
  const category = clean(formData.get("category"), 20);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const expenseDate = clean(formData.get("expense_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

  if (!title) return { error: "خرچ کی تفصیل ضروری ہے۔" };
  if (!EXPENSE_CATEGORIES.includes(category as ExpenseCategory))
    return { error: "زمرہ درست منتخب کریں۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate))
    return { error: "تاریخ درست شکل میں لکھیں۔" };
  if (expenseDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: "ادائیگی کا طریقہ درست منتخب کریں۔" };

  return {
    fields: {
      title,
      category: category as ExpenseCategory,
      amount,
      expenseDate,
      paymentMethod: paymentMethod as PaymentMethod,
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

/** نیا خرچ درج کریں — واؤچر نمبر خودکار (V-0001…) */
export async function addExpense(formData: FormData): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "expenses"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کا خرچ درج نہیں ہو سکتا
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.expenseDate))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // واؤچر نمبر: اس مدرسے کے اخراجات کی گنتی + 1
  const { count } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const voucherNumber = `V-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      madrasa_id: mine.madrasaId,
      voucher_number: voucherNumber,
      title: f.title,
      category: f.category,
      amount: f.amount,
      expense_date: f.expenseDate,
      payment_method: f.paymentMethod,
      note: f.note || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    // واؤچر نمبر دو بار بن جائے تو صاف غلطی
    if ((error as { code?: string } | null)?.code === "23505") {
      return { error: "واؤچر نمبر دو بار بن گیا — دوبارہ کوشش کریں۔" };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "expense_created", {
    expense_id: data.id as string,
    voucher_number: voucherNumber,
    title: f.title,
  });

  revalidatePath("/departments/expenses");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط خرچ منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidExpense(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "expenses"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کا خرچ منسوخ نہیں ہو سکتا
  const { data: row } = await supabase
    .from("expenses")
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
    .from("expenses")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, voucher_number, title")
    .single();

  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا — شاید یہ خرچ پہلے سے منسوخ ہے۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "expense_voided", {
    expense_id: data.id as string,
    voucher_number: data.voucher_number as string,
    title: data.title as string,
  });

  revalidatePath("/departments/expenses");
  revalidatePath(`/departments/expenses/${id}`);
  revalidatePath("/");
  return { ok: true };
}
