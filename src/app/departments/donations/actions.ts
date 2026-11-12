/**
 * مرحلہ 20 — عطیات کے Server Actions (اضافہ / منسوخی)
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
import { SECTION_IDS, getMyMadrasa, type SectionId } from "@/lib/students";
import {
  CLOSED_MONTH_ERROR,
  isMonthClosed,
  monthOfDate,
} from "@/lib/monthClosing";
import { todayInKarachi } from "@/lib/attendance";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/fees";
import { DONATION_KINDS, type DonationKind } from "@/lib/donations";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface DonationFields {
  section: SectionId;
  kind: DonationKind;
  donorName: string;
  amount: number;
  donationDate: string;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: DonationFields } | { error: string } {
  const kind = clean(formData.get("kind"), 20);
  const donorName = clean(formData.get("donor_name"), 100);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const donationDate = clean(formData.get("donation_date"), 10);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);
  const section = clean(formData.get("section"), 20);

  if (!DONATION_KINDS.includes(kind as DonationKind))
    return { error: "قسم درست منتخب کریں (صدقہ، عطیہ یا دیگر)۔" };
  if (!donorName) return { error: "عطیہ دینے والے کا نام ضروری ہے۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(donationDate))
    return { error: "تاریخ درست شکل میں لکھیں۔" };
  if (donationDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: "ادائیگی کا طریقہ درست منتخب کریں۔" };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: "شعبہ (بنین / بنات) درست منتخب کریں۔" };

  return {
    fields: {
      kind: kind as DonationKind,
      donorName,
      amount,
      donationDate,
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

/** نیا عطیہ درج کریں — رسید نمبر خودکار (D-0001…) */
export async function addDonation(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "donations"))) {
    return { error: MODULE_DENIED_ERROR };
  }
  // مرحلہ 62 — شعبہ بند ہو تو اس شعبے میں اندراج نہیں ہو سکتا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section)) {
    return { error: "اس شعبے میں ریکارڈ درج کرنے کی اجازت نہیں ہے۔" };
  }

  // مرحلہ 39 — بند مہینے کا عطیہ درج نہیں ہو سکتا
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.donationDate))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // رسید نمبر: اس مدرسے کے عطیات کی گنتی + 1
  const { count } = await supabase
    .from("donations")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const receiptNumber = `D-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("donations")
    .insert({
      madrasa_id: mine.madrasaId,
      receipt_number: receiptNumber,
      kind: f.kind,
      donor_name: f.donorName,
      amount: f.amount,
      donation_date: f.donationDate,
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
      return { error: "رسید نمبر دو بار بن گیا — دوبارہ کوشش کریں۔" };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "donation_created", {
    donation_id: data.id as string,
    receipt_number: receiptNumber,
    kind: f.kind,
  });

  revalidatePath("/departments/donations");
  revalidatePath("/departments/monthly");
  revalidatePath("/departments/yearly");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط اندراج منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidDonation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "donations"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // مرحلہ 39 — بند مہینے کا عطیہ منسوخ نہیں ہو سکتا
  const { data: row } = await supabase
    .from("donations")
    .select("donation_date")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .maybeSingle();
  if (
    row &&
    (await isMonthClosed(
      supabase,
      mine.madrasaId,
      monthOfDate(row.donation_date as string),
    ))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  const { data, error } = await supabase
    .from("donations")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, receipt_number, donor_name")
    .single();

  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا — شاید یہ اندراج پہلے سے منسوخ ہے۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "donation_voided", {
    donation_id: data.id as string,
    receipt_number: data.receipt_number as string,
    donor_name: data.donor_name as string,
  });

  revalidatePath("/departments/donations");
  revalidatePath(`/departments/donations/${id}`);
  revalidatePath("/departments/monthly");
  revalidatePath("/departments/yearly");
  revalidatePath("/");
  return { ok: true };
}
