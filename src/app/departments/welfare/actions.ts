/**
 * مرحلہ 21 — فلاحی کام کے Server Actions (اضافہ / منسوخی)
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
import { WELFARE_KINDS, type WelfareKind } from "@/lib/welfare";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface WelfareFields {
  studentId: string;
  kind: WelfareKind;
  amount: number;
  recordDate: string;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: WelfareFields } | { error: string } {
  const studentId = clean(formData.get("student_id"), 50);
  const kind = clean(formData.get("kind"), 20);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const recordDate = clean(formData.get("record_date"), 10);
  const note = clean(formData.get("note"), 500);

  if (!studentId) return { error: "طالبہ منتخب کریں۔" };
  if (!WELFARE_KINDS.includes(kind as WelfareKind))
    return { error: "قسم درست منتخب کریں (وظیفہ، مالی معاونت یا دیگر)۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recordDate))
    return { error: "تاریخ درست شکل میں لکھیں۔" };
  if (recordDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };

  return {
    fields: {
      studentId,
      kind: kind as WelfareKind,
      amount,
      recordDate,
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
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 39 — بند مہینے کی امداد درج نہیں ہو سکتی
  if (
    await isMonthClosed(supabase, mine.madrasaId, monthOfDate(f.recordDate))
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // طالبہ اسی مدرسے کی اور فعال ہونی چاہیے
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", f.studentId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .single();
  if (!student) return { error: "طالبہ نہیں ملی — فعال طالبہ منتخب کریں۔" };

  // ریکارڈ نمبر: اس مدرسے کے فلاحی اندراجات کی گنتی + 1
  const { count } = await supabase
    .from("welfare_records")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const recordNumber = `W-${String((count ?? 0) + 1).padStart(4, "0")}`;

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

  await writeAudit(supabase, mine.madrasaId, mine.userId, "welfare_created", {
    welfare_id: data.id as string,
    record_number: recordNumber,
    kind: f.kind,
  });

  revalidatePath("/departments/welfare");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط اندراج منسوخ کریں — ریکارڈ رہتا ہے، رقم کل سے نکل جاتی ہے */
export async function voidWelfare(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // مرحلہ 39 — بند مہینے کی امداد منسوخ نہیں ہو سکتی
  const { data: row } = await supabase
    .from("welfare_records")
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
    .from("welfare_records")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, record_number")
    .single();

  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا — شاید یہ اندراج پہلے سے منسوخ ہے۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "welfare_voided", {
    welfare_id: data.id as string,
    record_number: data.record_number as string,
  });

  revalidatePath("/departments/welfare");
  revalidatePath(`/departments/welfare/${id}`);
  revalidatePath("/");
  return { ok: true };
}
