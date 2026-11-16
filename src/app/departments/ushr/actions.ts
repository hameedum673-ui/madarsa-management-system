/**
 * مرحلہ 48 — عشر کے Server Actions (اضافہ / منسوخی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * غلط اندراج کبھی حذف نہیں ہوتا — صرف منسوخ ہوتا ہے (فیس والا ہی اصول)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
} from "@/lib/permissions";
import { t, isLang, type Lang } from "@/i18n/dictionary";
import { SECTION_IDS, getMyMadrasa, type SectionId } from "@/lib/students";
import { isMonthClosed, monthOfDate } from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/fees";
import { type UshrKind } from "@/lib/ushr";

type ActionResult = { ok: true; id?: string } | { error: string };

// مرحلہ 118 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو)
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface UshrFields {
  section: SectionId;
  kind: UshrKind;
  personName: string;
  amount: number;
  recordDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: UshrFields } | { error: string } {
  const lang = formLang(formData);
  // مرحلہ 49 — تقسیم ختم: ہر نیا اندراج "وصولی" ہے، فارم سے قسم نہیں آتی
  const kind: UshrKind = "received";
  const personName = clean(formData.get("person_name"), 100);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const recordDate = clean(formData.get("record_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);
  const section = clean(formData.get("section"), 20);

  if (!personName) return { error: t(lang, "funds.err.name_required") };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: t(lang, "funds.err.amount_invalid") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate))
    return { error: t(lang, "funds.err.date_invalid") };
  if (recordDate > todayInKarachi())
    return { error: t(lang, "funds.err.date_future") };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: t(lang, "exp.err.method_invalid") };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: t(lang, "funds.err.section_invalid") };

  return {
    fields: {
      kind,
      personName,
      amount,
      recordDate,
      paymentMethod: paymentMethod as PaymentMethod,
      section: section as SectionId,
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

/** نیا عشر اندراج — رسید نمبر خودکار (U-0001…) */
export async function addUshrRecord(
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "ushr"))) {
    return { error: t(lang, "common.not_allowed") };
  }
  // مرحلہ 62 — شعبہ بند ہو تو اس شعبے میں اندراج نہیں ہو سکتا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section)) {
    return { error: t(lang, "funds.err.section_denied") };
  }

  // مرحلہ 39 — بند مہینے کی عشر درج نہیں ہو سکتی
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.recordDate))
  ) {
    return { error: t(lang, "common.closed_month") };
  }

  // رسید نمبر: اس مدرسے کے عشر اندراجات کی گنتی + 1
  const { count } = await supabase
    .from("ushr_records")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const receiptNumber = `U-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("ushr_records")
    .insert({
      madrasa_id: mine.madrasaId,
      receipt_number: receiptNumber,
      kind: f.kind,
      person_name: f.personName,
      amount: f.amount,
      record_date: f.recordDate,
      payment_method: f.paymentMethod,
      note: f.note || null,
      section: f.section,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    // رسید نمبر دو بار بن جائے تو صاف غلطی
    if ((error as { code?: string } | null)?.code === "23505") {
      return { error: t(lang, "funds.err.receipt_clash") };
    }
    return { error: t(lang, "funds.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "ushr_created", {
    ushr_id: data.id as string,
    receipt_number: receiptNumber,
    kind: f.kind,
  });

  revalidatePath("/departments/ushr");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط اندراج منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidUshrRecord(
  id: string,
  lang: Lang = "ur",
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "ushr"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 39 — بند مہینے کی عشر منسوخ نہیں ہو سکتی
  const { data: row } = await supabase
    .from("ushr_records")
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
    return { error: t(lang, "common.closed_month") };
  }

  const { data, error } = await supabase
    .from("ushr_records")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, receipt_number, person_name")
    .single();

  if (error || !data) {
    return { error: t(lang, "ushr.err.void_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "ushr_voided", {
    ushr_id: data.id as string,
    receipt_number: data.receipt_number as string,
    person_name: data.person_name as string,
  });

  revalidatePath("/departments/ushr");
  revalidatePath(`/departments/ushr/${id}`);
  revalidatePath("/");
  return { ok: true };
}
