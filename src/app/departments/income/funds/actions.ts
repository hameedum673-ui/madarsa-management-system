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
import { SECTION_IDS, getMyMadrasa, type SectionId } from "@/lib/students";
import { getMyAllowedSections } from "@/lib/permissions";
import { isAppAdmin } from "@/lib/approval";
import { isMonthClosed, monthOfDate } from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/fees";
import { t, isLang, type Lang } from "@/i18n/dictionary";
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
  section: SectionId;
  fund: FundCategory;
  personName: string;
  amount: number;
  recordDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** مرحلہ 112 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
  lang: Lang,
): { fields: FundFields } | { error: string } {
  const fund = clean(formData.get("fund"), 20);
  const personName = clean(formData.get("person_name"), 100);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const recordDate = clean(formData.get("record_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);
  const section = clean(formData.get("section"), 20);

  if (!FUND_CATEGORIES.includes(fund as FundCategory))
    return { error: t(lang, "funds.err.fund_invalid") };
  if (!personName) return { error: t(lang, "funds.err.name_required") };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: t(lang, "funds.err.amount_invalid") };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate))
    return { error: t(lang, "funds.err.date_invalid") };
  if (recordDate > todayInKarachi())
    return { error: t(lang, "funds.err.date_future") };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: t(lang, "fee.err.method_invalid") };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: t(lang, "funds.err.section_invalid") };

  return {
    fields: {
      fund: fund as FundCategory,
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

/** نیا اندراج — مد کے حساب سے زکوٰۃ، عشر یا عطیات کی میز میں */
export async function addFundRecord(
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };

  // اس مد کی اجازت ہے؟ (ایڈمن کو سب کی اجازت ہے)
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    const { data: allowed } = await supabase.rpc("my_module_allowed", {
      p_module: FUND_MODULE[f.fund],
    });
    if (allowed === false) {
      return { error: t(lang, "funds.err.fund_denied") };
    }
  }
  // مرحلہ 62 — شعبہ بند ہو تو اس شعبے میں اندراج نہیں ہو سکتا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section)) {
    return { error: t(lang, "funds.err.section_denied") };
  }

  // مرحلہ 39 — بند مہینے میں اندراج نہیں ہو سکتا
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.recordDate))
  ) {
    return { error: t(lang, "common.closed_month") };
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
        section: f.section,
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
        section: f.section,
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
      return { error: t(lang, "funds.err.receipt_clash") };
    }
    return { error: t(lang, "funds.err.save_failed") };
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
