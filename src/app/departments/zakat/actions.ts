/**
 * مرحلہ 19 — زکوٰۃ کے Server Actions (اضافہ / منسوخی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف منسوخ ہوتا ہے (فیس والا ہی اصول)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import {
  CLOSED_MONTH_ERROR,
  isMonthClosed,
  monthOfDate,
} from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/fees";
import { type ZakatKind } from "@/lib/zakat";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface ZakatFields {
  kind: ZakatKind;
  personName: string;
  amount: number;
  recordDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: ZakatFields } | { error: string } {
  // مرحلہ 49 — تقسیم ختم: ہر نیا اندراج "وصولی" ہے، فارم سے قسم نہیں آتی
  const kind: ZakatKind = "received";
  const personName = clean(formData.get("person_name"), 100);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const recordDate = clean(formData.get("record_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

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
      kind,
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

/** نیا زکوٰۃ اندراج — رسید نمبر خودکار (Z-0001…) */
export async function addZakatRecord(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 39 — بند مہینے کی زکوٰۃ درج نہیں ہو سکتی
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.recordDate))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // رسید نمبر: اس مدرسے کے زکوٰۃ اندراجات کی گنتی + 1
  const { count } = await supabase
    .from("zakat_records")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const receiptNumber = `Z-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("zakat_records")
    .insert({
      madrasa_id: mine.madrasaId,
      receipt_number: receiptNumber,
      kind: f.kind,
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

  if (error || !data) {
    // رسید نمبر دو بار بن جائے تو صاف غلطی
    if ((error as { code?: string } | null)?.code === "23505") {
      return { error: "رسید نمبر دو بار بن گیا — دوبارہ کوشش کریں۔" };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "zakat_created", {
    zakat_id: data.id as string,
    receipt_number: receiptNumber,
    kind: f.kind,
  });

  revalidatePath("/departments/zakat");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط اندراج منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidZakatRecord(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 39 — بند مہینے کی زکوٰۃ منسوخ نہیں ہو سکتی
  const { data: row } = await supabase
    .from("zakat_records")
    .select("record_date")
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
    return { error: CLOSED_MONTH_ERROR };
  }

  const { data, error } = await supabase
    .from("zakat_records")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, receipt_number, person_name")
    .single();

  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا — شاید یہ اندراج پہلے سے منسوخ ہے۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "zakat_voided", {
    zakat_id: data.id as string,
    receipt_number: data.receipt_number as string,
    person_name: data.person_name as string,
  });

  revalidatePath("/departments/zakat");
  revalidatePath(`/departments/zakat/${id}`);
  revalidatePath("/");
  return { ok: true };
}
