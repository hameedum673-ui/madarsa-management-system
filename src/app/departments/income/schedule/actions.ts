/**
 * مرحلہ 37 — ماہانہ فیس کے شیڈول کے Server Actions (طے کرنا / غیر فعال کرنا)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * فیس کا ریکارڈ کبھی حذف نہیں ہوتا — صرف status = 'inactive' کیا جاتا ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEPARTMENT_IDS,
  getMyMadrasa,
  type DepartmentId,
} from "@/lib/students";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface FeeScheduleFields {
  department: DepartmentId;
  className: string;
  amount: number;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: FeeScheduleFields } | { error: string } {
  const department = clean(formData.get("department"), 20);
  const className = clean(formData.get("class_name"), 100);
  const amountRaw = clean(formData.get("amount"), 10);
  const amount = Number(amountRaw);

  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { error: "شعبہ درست منتخب کریں (حفظ، ناظرہ یا درسِ نظامی)۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 روپے کے درمیان ہونی چاہیے۔" };

  return {
    fields: {
      department: department as DepartmentId,
      className,
      amount,
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

/** فیس طے کریں — ایک شعبہ / جماعت کی ایک ہی رقم ہوتی ہے (دوبارہ طے کرنے پر بدل جاتی ہے) */
export async function saveFeeSchedule(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // جماعت دی ہو تو وہ اس شعبے کی فعال جماعت ہونی چاہیے
  if (f.className !== "") {
    const { data: cls } = await supabase
      .from("classes")
      .select("id")
      .eq("department", f.department)
      .eq("name", f.className)
      .eq("status", "active")
      .maybeSingle();
    if (!cls) {
      return { error: "یہ جماعت اس شعبے کی درجات میں درج نہیں ہے۔" };
    }
  }

  const { error } = await supabase.from("fee_schedule").upsert(
    {
      madrasa_id: mine.madrasaId,
      department: f.department,
      class_name: f.className,
      amount: f.amount,
      status: "active",
    },
    { onConflict: "madrasa_id,department,class_name" },
  );

  if (error) {
    return { error: "فیس محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "fee_schedule_saved",
    {
      department: f.department,
      class_name: f.className,
      amount: String(f.amount),
    },
  );

  revalidatePath("/departments/income/schedule");
  revalidatePath("/departments/income/fees/new");
  revalidatePath("/departments/income/fees");
  return { ok: true };
}

/** فیس غیر فعال کریں — ریکارڈ حذف نہیں ہوتا، صرف بند ہوتا ہے */
export async function deactivateFeeSchedule(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  const { data, error } = await supabase
    .from("fee_schedule")
    .update({ status: "inactive" })
    .eq("id", id)
    .eq("status", "active")
    .select("department, class_name, amount")
    .single();

  if (error || !data) {
    return { error: "غیر فعال نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "fee_schedule_deactivated",
    {
      department: data.department as string,
      class_name: data.class_name as string,
      amount: String(data.amount as number),
    },
  );

  revalidatePath("/departments/income/schedule");
  revalidatePath("/departments/income/fees/new");
  return { ok: true };
}
