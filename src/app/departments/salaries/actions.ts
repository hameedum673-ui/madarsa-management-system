/**
 * مرحلہ 50 — تنخواہوں کے Server Actions (مقررہ تنخواہ / ادائیگی / منسوخی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * تنخواہیں صرف ایڈمن کے لیے ہیں — ہر action پہلے ایڈمن ہونے کی جانچ کرتا ہے۔
 * تنخواہ دیتے ہی اخراجات میں خودکار واؤچر بنتا ہے (قسم "تنخواہ")، اس لیے
 * بیلنس اور ماہانہ حساب میں تنخواہ خودبخود شامل ہو جاتی ہے — دوہرا حساب نہیں۔
 * غلط ادائیگی کبھی حذف نہیں ہوتی — صرف منسوخ ہوتی ہے (اور اس سے جڑا واؤچر بھی)۔
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
import {
  PAYMENT_METHODS,
  currentMonthInKarachi,
  formatMonthUrdu,
  isValidMonth,
  type PaymentMethod,
} from "@/lib/fees";
import {
  SALARY_PERSON_TYPES,
  SALARY_PERSON_TYPE_LABELS,
  type SalaryPersonType,
} from "@/lib/salaries";

type ActionResult = { ok: true; id?: string } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

/** شخص کا نام اور حالت دیکھیں — استاد یا عملہ، اپنے مدرسے کا فعال */
async function getPerson(
  supabase: Awaited<ReturnType<typeof createClient>>,
  madrasaId: string,
  personType: SalaryPersonType,
  personId: string,
): Promise<{ name: string; section: string | null } | null> {
  const table = personType === "teacher" ? "teachers" : "staff";
  const { data } = await supabase
    .from(table)
    .select("name, section")
    .eq("id", personId)
    .eq("madrasa_id", madrasaId)
    .eq("status", "active")
    .maybeSingle();
  return (data as { name: string; section: string | null } | null) ?? null;
}

/** مقررہ تنخواہ طے کریں — خالی رقم کا مطلب ہے مقررہ تنخواہ ختم */
export async function setMonthlySalary(
  formData: FormData,
): Promise<ActionResult> {
  const personType = clean(formData.get("person_type"), 20);
  const personId = clean(formData.get("person_id"), 40);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = amountRaw === "" ? null : Number(amountRaw);

  if (!SALARY_PERSON_TYPES.includes(personType as SalaryPersonType))
    return { error: "شخص درست منتخب کریں (استاد یا عملہ)۔" };
  if (!personId) return { error: "شخص ضروری ہے۔" };
  if (
    amount !== null &&
    (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
  )
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isAppAdmin(supabase)))
    return { error: "صرف ایڈمن تنخواہ طے کر سکتا ہے۔" };

  const person = await getPerson(
    supabase,
    mine.madrasaId,
    personType as SalaryPersonType,
    personId,
  );
  if (!person) return { error: "یہ شخص آپ کے ریکارڈ میں نہیں ہے۔" };

  const table = personType === "teacher" ? "teachers" : "staff";
  const { error } = await supabase
    .from(table)
    .update({ monthly_salary: amount })
    .eq("id", personId)
    .eq("madrasa_id", mine.madrasaId);
  if (error) return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };

  await writeAudit(supabase, mine.madrasaId, mine.userId, "salary_set", {
    person_type: personType,
    person_name: person.name,
    monthly_salary: amount === null ? "ختم" : String(amount),
  });

  revalidatePath("/departments/salaries");
  revalidatePath("/departments/salaries/set");
  return { ok: true };
}

interface SalaryFields {
  personType: SalaryPersonType;
  personId: string;
  salaryMonth: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: SalaryFields } | { error: string } {
  const personType = clean(formData.get("person_type"), 20);
  const personId = clean(formData.get("person_id"), 40);
  const salaryMonth = clean(formData.get("salary_month"), 10);
  const paymentDate = clean(formData.get("payment_date"), 10);
  const amountRaw = clean(formData.get("amount"), 12);
  const amount = Number(amountRaw);
  const paymentMethod = clean(formData.get("payment_method"), 20);
  const note = clean(formData.get("note"), 500);

  if (!SALARY_PERSON_TYPES.includes(personType as SalaryPersonType))
    return { error: "شخص درست منتخب کریں (استاد یا عملہ)۔" };
  if (!personId) return { error: "شخص ضروری ہے۔" };
  if (!isValidMonth(salaryMonth))
    return { error: "مہینہ درست شکل میں لکھیں (مثلاً 2026-11)۔" };
  if (salaryMonth > currentMonthInKarachi())
    return { error: "تنخواہ آنے والے مہینے کی نہیں دی جا سکتی۔" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate))
    return { error: "تاریخ درست شکل میں لکھیں۔" };
  if (paymentDate > todayInKarachi())
    return { error: "تاریخ آج سے آگے نہیں ہو سکتی۔" };
  if (!Number.isInteger(amount) || amount < 1 || amount > 10000000)
    return { error: "رقم 1 سے 10,000,000 کے درمیان ہونی چاہیے۔" };
  if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod))
    return { error: "ادائیگی کا طریقہ درست منتخب کریں۔" };

  return {
    fields: {
      personType: personType as SalaryPersonType,
      personId,
      salaryMonth,
      paymentDate,
      amount,
      paymentMethod: paymentMethod as PaymentMethod,
      note,
    },
  };
}

/** تنخواہ دیں — ساتھ ہی اخراجات میں خودکار واؤچر بنتا ہے */
export async function addSalaryPayment(
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isAppAdmin(supabase)))
    return { error: "صرف ایڈمن تنخواہ دے سکتا ہے۔" };

  const person = await getPerson(
    supabase,
    mine.madrasaId,
    f.personType,
    f.personId,
  );
  if (!person) return { error: "یہ شخص آپ کے ریکارڈ میں نہیں ہے۔" };

  // مرحلہ 39 — بند مہینے کی تنخواہ نہیں دی جا سکتی
  if (await isMonthClosed(supabase, mine.madrasaId, f.salaryMonth)) {
    return { error: CLOSED_MONTH_ERROR };
  }
  if (
    await isMonthClosed(
      supabase,
      mine.madrasaId,
      monthOfDate(f.paymentDate),
    )
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  // ایک شخص کی ایک مہینے کی تنخواہ صرف ایک بار
  const { data: existing } = await supabase
    .from("salary_payments")
    .select("id")
    .eq("madrasa_id", mine.madrasaId)
    .eq("person_type", f.personType)
    .eq("person_id", f.personId)
    .eq("salary_month", f.salaryMonth)
    .eq("status", "active")
    .maybeSingle();
  if (existing) {
    return {
      error: `اس شخص کی ${formatMonthUrdu(f.salaryMonth)} کی تنخواہ پہلے سے دی جا چکی ہے۔`,
    };
  }

  // پہلے جڑا ہوا واؤچر بنائیں (قسم "تنخواہ")
  const { count } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  const voucherNumber = `V-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const expenseTitle = `تنخواہ — ${person.name} — ${formatMonthUrdu(f.salaryMonth)}`;
  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      madrasa_id: mine.madrasaId,
      voucher_number: voucherNumber,
      title: expenseTitle,
      category: "salary",
      // مرحلہ 62 — تنخواہ کا واؤچر اس شخص کے شعبے کا ہوتا ہے
      section: person.section ?? "banat",
      amount: f.amount,
      expense_date: f.paymentDate,
      payment_method: f.paymentMethod,
      note: f.note || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();
  if (expenseError || !expense) {
    if ((expenseError as { code?: string } | null)?.code === "23505") {
      return { error: "واؤچر نمبر دو بار بن گیا — دوبارہ کوشش کریں۔" };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }
  const expenseId = expense.id as string;

  const { data, error } = await supabase
    .from("salary_payments")
    .insert({
      madrasa_id: mine.madrasaId,
      person_type: f.personType,
      person_id: f.personId,
      salary_month: f.salaryMonth,
      payment_date: f.paymentDate,
      amount: f.amount,
      payment_method: f.paymentMethod,
      note: f.note || null,
      expense_id: expenseId,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    // تنخواہ محفوظ نہ ہوئی تو جڑا ہوا واؤچر بھی منسوخ کر دیں
    await supabase
      .from("expenses")
      .update({ status: "voided", updated_at: new Date().toISOString() })
      .eq("id", expenseId)
      .eq("madrasa_id", mine.madrasaId)
      .eq("status", "active");
    if ((error as { code?: string } | null)?.code === "23505") {
      return {
        error: `اس شخص کی ${formatMonthUrdu(f.salaryMonth)} کی تنخواہ پہلے سے دی جا چکی ہے۔`,
      };
    }
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "salary_created", {
    person_type: f.personType,
    person_name: person.name,
    salary_month: f.salaryMonth,
    voucher_number: voucherNumber,
  });

  revalidatePath("/departments/salaries");
  revalidatePath("/departments/expenses");
  revalidatePath("/departments/monthly");
  revalidatePath("/");
  return { ok: true, id: data.id as string };
}

/** غلط ادائیگی منسوخ کریں — جڑا ہوا واؤچر بھی منسوخ ہوتا ہے */
export async function voidSalaryPayment(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isAppAdmin(supabase)))
    return { error: "صرف ایڈمن تنخواہ منسوخ کر سکتا ہے۔" };

  const { data: row } = await supabase
    .from("salary_payments")
    .select("salary_month, expense_id, person_type, person_id, amount")
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .maybeSingle();
  if (!row) {
    return { error: "منسوخ نہیں ہو سکا — شاید یہ ادائیگی پہلے سے منسوخ ہے۔" };
  }

  // مرحلہ 39 — بند مہینے کی ادائیگی منسوخ نہیں ہو سکتی
  if (
    await isMonthClosed(
      supabase,
      mine.madrasaId,
      row.salary_month as string,
    )
  ) {
    return { error: CLOSED_MONTH_ERROR };
  }

  const { data, error } = await supabase
    .from("salary_payments")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id")
    .single();
  if (error || !data) {
    return { error: "منسوخ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  // جڑا ہوا واؤچر بھی منسوخ کریں (اگر ابھی فعال ہے)
  if (row.expense_id) {
    await supabase
      .from("expenses")
      .update({ status: "voided", updated_at: new Date().toISOString() })
      .eq("id", row.expense_id as string)
      .eq("madrasa_id", mine.madrasaId)
      .eq("status", "active");
  }

  const person = await getPerson(
    supabase,
    mine.madrasaId,
    row.person_type as SalaryPersonType,
    row.person_id as string,
  );
  await writeAudit(supabase, mine.madrasaId, mine.userId, "salary_voided", {
    person_name: person?.name ?? "",
    salary_month: row.salary_month as string,
  });

  revalidatePath("/departments/salaries");
  revalidatePath(`/departments/salaries/${id}`);
  revalidatePath("/departments/expenses");
  revalidatePath("/departments/monthly");
  revalidatePath("/");
  return { ok: true };
}
