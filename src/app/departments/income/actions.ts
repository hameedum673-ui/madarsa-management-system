/**
 * مرحلہ 8 — فیس کے Server Actions (درج کرنا / منسوخ کرنا)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * رسید نمبر خودکار ہے: R-0001، R-0002… (اپنے مدرسے کی فیس کی گنتی + 1)۔
 * مالی ریکارڈ کبھی حذف نہیں ہوتا — غلط رسید صرف «منسوخ» کی جاتی ہے۔
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
import { CLOSED_MONTH_ERROR, isMonthClosed } from "@/lib/monthClosing";
import {
  PAYMENT_METHODS,
  isValidMonth,
  type PaymentMethod,
} from "@/lib/fees";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

function notFuture(value: string): boolean {
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d <= today;
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

/** نئی فیس درج کریں — رسید نمبر خودکار بنتا ہے */
export async function addFeePayment(
  formData: FormData,
): Promise<ActionResult> {
  const studentId = clean(formData.get("student_id"), 40);
  const feeMonth = clean(formData.get("fee_month"), 7);
  const amountRaw = clean(formData.get("amount"), 12);
  const paymentDate = clean(formData.get("payment_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

  if (!/^[0-9a-f-]{36}$/i.test(studentId))
    return { error: "طالبہ درست منتخب کریں۔" };
  if (!isValidMonth(feeMonth)) return { error: "مہینہ درست نہیں ہے۔" };
  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم درست لکھیں (1 سے 1 کروڑ روپے تک)۔" };
  if (!validDate(paymentDate))
    return { error: "ادائیگی کی تاریخ درست نہیں ہے۔" };
  if (!notFuture(paymentDate))
    return { error: "ادائیگی کی تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: "ادائیگی کا طریقہ درست منتخب کریں۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "income"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کی فیس درج نہیں ہو سکتی
  if (await isMonthClosed(supabase, mine.madrasaId, feeMonth)) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // صرف اپنے مدرسے کی فعال طالبہ کی فیس درج ہو سکتی ہے
  const { data: student } = await supabase
    .from("students")
    .select("id, name, section")
    .eq("id", studentId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .single();
  if (!student) return { error: "طالبہ کی تصدیق نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  // مرحلہ 54 — بند شعبے کی طالبہ کی فیس درج نہیں ہو سکے گی
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      ((student as { section?: string | null }).section ?? "banat") as SectionId,
    )
  )
    return { error: "اس شعبے کی طالبہ کی فیس درج کرنے کی اجازت نہیں ہے۔" };

  // اگلا رسید نمبر: اپنے مدرسے کی فیس کی گنتی + 1
  const { count } = await supabase
    .from("fee_payments")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const receiptNumber = `R-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("fee_payments")
    .insert({
      madrasa_id: mine.madrasaId,
      student_id: studentId,
      receipt_number: receiptNumber,
      fee_month: feeMonth,
      amount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      note: note || null,
      status: "active",
      received_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "23505")
      return { error: "رسید نمبر ٹکرا گیا — دوبارہ کوشش کریں۔" };
    return { error: "فیس محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "fee_payment_created", {
    fee_payment_id: data.id as string,
    receipt_number: receiptNumber,
    student_id: studentId,
    fee_month: feeMonth,
    amount: String(amount),
  });

  revalidatePath("/departments/income/fees");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** رسید منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidFeePayment(id: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { error: "رسید درست نہیں ہے۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "income"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کی رسید منسوخ نہیں ہو سکتی
  const { data: row } = await supabase
    .from("fee_payments")
    .select("fee_month")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .maybeSingle();
  if (
    row &&
    (await isMonthClosed(supabase, mine.madrasaId, row.fee_month as string))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // RLS خود یقین دلاتی ہے کہ یہ رسید اسی مدرسے کی ہے؛
  // صرف فعال رسید منسوخ ہو سکتی ہے — منسوخ شدہ دوبارہ نہیں
  const { data, error } = await supabase
    .from("fee_payments")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, receipt_number, amount")
    .single();

  if (error || !data) {
    return { error: "رسید منسوخ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "fee_payment_voided", {
    fee_payment_id: data.id as string,
    receipt_number: data.receipt_number as string,
    amount: String(data.amount as number),
  });

  revalidatePath("/departments/income/fees");
  revalidatePath(`/departments/income/fees/${id}`);
  revalidatePath("/");
  return { ok: true };
}
