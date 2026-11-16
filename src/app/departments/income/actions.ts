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
} from "@/lib/permissions";
import { t, isLang, type Lang } from "@/i18n/dictionary";
import { getMyMadrasa,
  type SectionId,
} from "@/lib/students";
import { isMonthClosed } from "@/lib/monthClosing";
import {
  PAYMENT_METHODS,
  isValidMonth,
  type PaymentMethod,
} from "@/lib/fees";

type ActionResult = { ok: true; id?: string } | { error: string };

/** مرحلہ 112 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

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
  const lang = formLang(formData);
  const studentId = clean(formData.get("student_id"), 40);
  const feeMonth = clean(formData.get("fee_month"), 7);
  const amountRaw = clean(formData.get("amount"), 12);
  const paymentDate = clean(formData.get("payment_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

  if (!/^[0-9a-f-]{36}$/i.test(studentId))
    return { error: t(lang, "fee.err.student_required") };
  if (!isValidMonth(feeMonth)) return { error: t(lang, "fee.err.month_invalid") };
  const amount = Number(amountRaw);
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: t(lang, "fee.err.amount_invalid") };
  if (!validDate(paymentDate))
    return { error: t(lang, "fee.err.date_invalid") };
  if (!notFuture(paymentDate))
    return { error: t(lang, "fee.err.date_future") };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: t(lang, "fee.err.method_invalid") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "income"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 39 — بند مہینے کی فیس درج نہیں ہو سکتی
  if (await isMonthClosed(supabase, mine.madrasaId, feeMonth)) {
    return { error: t(lang, "common.closed_month") };
  }

  // صرف اپنے مدرسے کی فعال طالبہ کی فیس درج ہو سکتی ہے
  const { data: student } = await supabase
    .from("students")
    .select("id, name, section")
    .eq("id", studentId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .single();
  if (!student) return { error: t(lang, "fee.err.student_verify") };
  // مرحلہ 54 — بند شعبے کی طالبہ کی فیس درج نہیں ہو سکے گی
  const allowedSections = await getMyAllowedSections(supabase);
  if (
    !allowedSections.has(
      ((student as { section?: string | null }).section ?? "banat") as SectionId,
    )
  )
    return { error: t(lang, "fee.err.section_denied") };

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
      return { error: t(lang, "fee.err.receipt_clash") };
    return { error: t(lang, "fee.err.save_failed") };
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
export async function voidFeePayment(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return { error: t(lang, "fee.err.receipt_invalid") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "income"))) {
    return { error: t(lang, "common.not_allowed") };
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
    return { error: t(lang, "common.closed_month") };
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
    return { error: t(lang, "fee.err.void_failed") };
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
