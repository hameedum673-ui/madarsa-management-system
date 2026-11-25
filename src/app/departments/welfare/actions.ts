/**
 * مرحلہ 21 — فلاحی کام کے Server Actions (اضافہ / منسوخی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف منسوخ ہوتا ہے (فیس والا ہی اصول)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe } from "@/lib/permissions";
import { t, isLang, type Lang } from "@/i18n/dictionary";
import { getMyMadrasa } from "@/lib/students";
import { isMonthClosed, monthOfDate } from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { WELFARE_KINDS, type WelfareKind } from "@/lib/welfare";
import {
  PAYMENT_METHODS,
  type PaymentMethod,
} from "@/lib/fees";

type ActionResult = { ok: true; id?: string } | { error: string };

// مرحلہ 120 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو)
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface WelfareFields {
  studentId: string;
  kind: WelfareKind;
  amount: number;
  recordDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: WelfareFields } | { error: string } {
  const lang = formLang(formData);
  const studentId = clean(formData.get("student_id"), 50);
  const kind = clean(formData.get("kind"), 20);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const recordDate = clean(formData.get("record_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

  if (!studentId) return { error: t(lang, "welfare.err.student_required") };
  if (!WELFARE_KINDS.includes(kind as WelfareKind))
    return { error: t(lang, "welfare.err.kind_invalid") };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: t(lang, "funds.err.amount_invalid") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate))
    return { error: t(lang, "funds.err.date_invalid") };
  if (recordDate > todayInKarachi())
    return { error: t(lang, "funds.err.date_future") };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: t(lang, "exp.err.method_invalid") };

  return {
    fields: {
      studentId,
      kind: kind as WelfareKind,
      amount,
      recordDate,
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

/** نیا فلاحی اندراج — ریکارڈ نمبر خودکار (W-0001…) */
export async function addWelfare(
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "welfare"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 39 — بند مہینے کی امداد درج نہیں ہو سکتی
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.recordDate))
  ) {
    return { error: t(lang, "common.closed_month") };
  }

  // طالبہ اسی مدرسے کی اور فعال ہونی چاہیے
  const { data: student } = await supabase
    .from("students")
    .select("id, name, section")
    .eq("id", f.studentId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .single();
  if (!student)
    return { error: t(lang, "welfare.err.student_not_found") };

  // ریکارڈ نمبر: اس مدرسے کے فلاحی اندراجات کی گنتی + 1
  const { count } = await supabase
    .from("welfare_records")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const recordNumber = `W-${String((count ?? 0) + 1).padStart(4, "0")}`;

  // تنخواہوں والا طریقہ — پہلے جڑا ہوا واؤچر بنائیں (زمرہ "دیگر") تاکہ رقم بیلنس میں آئے
  const { count: expCount } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const voucherNumber = `V-${String((expCount ?? 0) + 1).padStart(4, "0")}`;
  const expenseTitle = `وظائف — ${student.name as string} — ${t("ur", `welfare.kind.${f.kind}`)} — ${recordNumber}`;
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      madrasa_id: mine.madrasaId,
      voucher_number: voucherNumber,
      title: expenseTitle,
      category: "other",
      section: (student.section as string | null) ?? "banat",
      amount: f.amount,
      expense_date: f.recordDate,
      payment_method: f.paymentMethod,
      note: f.note || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();
  if (expenseError || !expense) {
    if ((expenseError as { code?: string } | null)?.code === "23505") {
      return { error: t(lang, "exp.err.voucher_clash") };
    }
    return { error: t(lang, "funds.err.save_failed") };
  }
  const expenseId = expense.id as string;

  const { data, error } = await supabase
    .from("welfare_records")
    .insert({
      madrasa_id: mine.madrasaId,
      student_id: f.studentId,
      record_number: recordNumber,
      kind: f.kind,
      amount: f.amount,
      record_date: f.recordDate,
      note: f.note || null,
      expense_id: expenseId,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    // ریکارڈ محفوظ نہ ہوا تو جڑا ہوا واؤچر بھی منسوخ کر دیں
    await supabase
      .from("expenses")
      .update({ status: "voided", updated_at: new Date().toISOString() })
      .eq("id", expenseId)
      .eq("madrasa_id", mine.madrasaId)
      .eq("status", "active");
    // ریکارڈ نمبر دو بار بن جائے تو صاف غلطی
    if ((error as { code?: string } | null)?.code === "23505") {
      return { error: t(lang, "welfare.err.record_clash") };
    }
    return { error: t(lang, "funds.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "welfare_created", {
    welfare_id: data.id as string,
    record_number: recordNumber,
    kind: f.kind,
    voucher_number: voucherNumber,
  });

  revalidatePath("/departments/welfare");
  revalidatePath("/departments/expenses");
  revalidatePath("/departments/monthly");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط اندراج منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidWelfare(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "welfare"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 39 — بند مہینے کی امداد منسوخ نہیں ہو سکتی
  const { data: row } = await supabase
    .from("welfare_records")
    .select("record_date, expense_id")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .maybeSingle();
  if (
    row &&
    (await isMonthClosed(
      supabase,
      mine.madrasaId,
      monthOfDate(row.record_date as string),
    ))
  ) {
    return { error: t(lang, "common.closed_month") };
  }

  const { data, error } = await supabase
    .from("welfare_records")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, record_number")
    .single();

  if (error || !data) {
    return { error: t(lang, "welfare.err.void_failed") };
  }

  // جڑا ہوا واؤچر بھی منسوخ کریں (پرانے ریکارڈوں میں جڑا واؤچر نہیں ہوتا)
  if (row?.expense_id) {
    await supabase
      .from("expenses")
      .update({ status: "voided", updated_at: new Date().toISOString() })
      .eq("id", row.expense_id as string)
      .eq("madrasa_id", mine.madrasaId)
      .eq("status", "active");
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "welfare_voided", {
    welfare_id: data.id as string,
    record_number: data.record_number as string,
  });

  revalidatePath("/departments/welfare");
  revalidatePath(`/departments/welfare/${id}`);
  revalidatePath("/departments/expenses");
  revalidatePath("/departments/monthly");
  revalidatePath("/");
  return { ok: true };
}
