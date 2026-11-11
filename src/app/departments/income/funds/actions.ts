/**
 * مرحلہ 49 — ملے ہوئے صفحے کے Server Actions (نیا اندراج)
 * ایک ہی فارم سے تینوں میزوں میں اندراج ہوتا ہے — "مد" بتاتی ہے کہ
 * پیسہ کس میز میں جائے گا۔ ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں
 * بھی ہر لکھنے پر لاگو ہوتی ہیں۔ رسید نمبر ہر میز کا اپنا خودکار ہے۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف منسوخ ہوتا ہے (اپنے صفحے سے)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";
import {
  CLOSED_MONTH_ERROR,
  isMonthClosed,
  monthOfDate,
} from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/fees";
import {
  FUND_CATEGORIES,
  FUND_MODULE,
  type FundCategory,
} from "@/lib/funds";

type ActionResult =
  | { ok: true; href: string }
  | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface FundFields {
  fund: FundCategory;
  personName: string;
  amount: number;
  recordDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: FundFields } | { error: string } {
  const fund = clean(formData.get("fund"), 20);
  const personName = clean(formData.get("person_name"), 100);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const recordDate = clean(formData.get("record_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

  if (!FUND_CATEGORIES.includes(fund as FundCategory))
    return { error: "مد درست منتخب کریں۔" };
  if (!personName) return { error: "نام ضروری ہے۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate))
    return { error: "تاریخ درست شکل میں لکھیں۔" };
  if (recordDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: "ادائیگی کا طریقہ درست منتخب کریں۔" };

  return {
    fields: {
      fund: fund as FundCategory,
      personName,
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

/** نیا اندراج — مد کے حساب سے زکوٰۃ، عشر یا عطیات کی میز میں */
export async function addFundRecord(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // اس مد کی اجازت ہے؟ (ایڈمن کو سب کی اجازت ہے)
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    const { data: allowed } = await supabase.rpc("my_module_allowed", {
      p_module: FUND_MODULE[f.fund],
    });
    if (allowed === false) {
      return { error: "اس مد کی اجازت نہیں ہے۔" };
    }
  }

  // مرحلہ 39 — بند مہینے میں اندراج نہیں ہو سکتا
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.recordDate))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // مد کے حساب سے میز، رسید نمبر اور قسم
  const table =
    f.fund === "zakat"
      ? "zakat_records"
      : f.fund === "ushr"
        ? "ushr_records"
        : "donations";
  const prefix = f.fund === "zakat" ? "Z" : f.fund === "ushr" ? "U" : "D";
  const listPath =
    f.fund === "zakat"
      ? "/departments/zakat"
      : f.fund === "ushr"
        ? "/departments/ushr"
        : "/departments/donations";
  const auditAction =
    f.fund === "zakat"
      ? "zakat_created"
      : f.fund === "ushr"
        ? "ushr_created"
        : "donation_created";

  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const receiptNumber = `${prefix}-${String((count ?? 0) + 1).padStart(4, "0")}`;

  // دونوں میزوں کے کالم ایک جیسے نہیں ہیں — اس لیے اندراج الگ الگ ہے
  let insertedId: string | null = null;
  let insertError: { code?: string } | null = null;
  if (table === "donations") {
    const { data, error } = await supabase
      .from("donations")
      .insert({
        madrasa_id: mine.madrasaId,
        receipt_number: receiptNumber,
        kind: f.fund === "other" ? "other" : "donation",
        donor_name: f.personName,
        amount: f.amount,
        donation_date: f.recordDate,
        payment_method: f.paymentMethod,
        note: f.note || null,
        status: "active",
        created_by: mine.userId,
      })
      .select("id")
      .single();
    insertedId = (data as { id: string } | null)?.id ?? null;
    insertError = error as { code?: string } | null;
  } else {
    const { data, error } = await supabase
      .from(table)
      .insert({
        madrasa_id: mine.madrasaId,
        receipt_number: receiptNumber,
        kind: "received",
        person_name: f.personName,
        amount: f.amount,
        record_date: f.recordDate,
        payment_method: f.paymentMethod,
        note: f.note || null,
        status: "active",
        created_by: mine.userId,
      })
      .select("id")
      .single();
    insertedId = (data as { id: string } | null)?.id ?? null;
    insertError = error as { code?: string } | null;
  }

  if (insertError || !insertedId) {
    if (insertError?.code === "23505") {
      return { error: "رسید نمبر دو بار بن گیا — دوبارہ کوشش کریں۔" };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, auditAction, {
    receipt_number: receiptNumber,
    fund: f.fund,
  });

  revalidatePath("/departments/income/funds");
  revalidatePath(listPath);
  revalidatePath("/departments/income");
  revalidatePath("/");
  return { ok: true, href: `${listPath}/${insertedId}` };
}
