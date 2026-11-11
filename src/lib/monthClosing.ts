/**
 * مرحلہ 39 — مہینے کی بندش کے مشترکہ مددگار
 * بند مہینے میں مالیاتی اندراج (نیا یا منسوخ) نہیں ہو سکتا۔
 * ناکامی پر بندش "کھلا" مانتی ہے تاکہ پرانی میز (migration سے پہلے)
 * کی وجہ سے کوئی کام نہ رکے۔
 */
import type { SupabaseClient } from "@supabase/supabase-js";

/** بند مہینے پر دکھائی جانے والی اردو غلطی */
export const CLOSED_MONTH_ERROR =
  "یہ مہینہ بند ہے — پہلے مہینہ دوبارہ کھولیں۔";

/** تاریخ "YYYY-MM-DD" سے مہینہ "YYYY-MM" */
export function monthOfDate(date: string): string {
  return date.slice(0, 7);
}

type Client = SupabaseClient;

/** کیا یہ مہینہ بند ہے؟ (میز نہ ہو یا غلطی ہو تو کھلا مانا جاتا ہے) */
export async function isMonthClosed(
  supabase: Client,
  madrasaId: string,
  month: string,
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from("month_closings")
      .select("is_closed")
      .eq("madrasa_id", madrasaId)
      .eq("month", month)
      .maybeSingle();
    return (data as { is_closed: boolean } | null)?.is_closed === true;
  } catch {
    return false;
  }
}

/** مہینہ بند کریں یا دوبارہ کھولیں (ایک قطار فی مہینہ) */
export async function upsertClosing(
  supabase: Client,
  madrasaId: string,
  month: string,
  closed: boolean,
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const { error } = await supabase.from("month_closings").upsert(
    {
      madrasa_id: madrasaId,
      month,
      is_closed: closed,
      closed_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "madrasa_id,month" },
  );
  if (error) {
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }
  return { ok: true };
}

/**
 * اس مہینے سے پہلے کا بقیہ = پہلے کی فعال فیس + عطیات
 * + (زکوٰۃ وصولی − تقسیم) + (عشر وصولی − تقسیم) − پہلے کے فعال اخراجات
 * (مرحلہ 48 — وکالت کا اصول: زکوٰۃ اور عشر آمدنی میں شامل ہیں)
 */
export async function getBalanceBefore(
  supabase: Client,
  month: string,
): Promise<number> {
  try {
    const { data: feesData } = await supabase
      .from("fee_payments")
      .select("amount")
      .lt("fee_month", month)
      .eq("status", "active");
    const { data: donationsData } = await supabase
      .from("donations")
      .select("amount")
      .lt("donation_date", `${month}-01`)
      .eq("status", "active");
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("amount")
      .lt("expense_date", `${month}-01`)
      .eq("status", "active");
    const { data: zakatData } = await supabase
      .from("zakat_records")
      .select("kind, amount")
      .lt("record_date", `${month}-01`)
      .eq("status", "active");
    const { data: ushrData } = await supabase
      .from("ushr_records")
      .select("kind, amount")
      .lt("record_date", `${month}-01`)
      .eq("status", "active");
    const fees = ((feesData ?? []) as { amount: number }[]).reduce(
      (sum, f) => sum + (f.amount ?? 0),
      0,
    );
    const donations = ((donationsData ?? []) as { amount: number }[]).reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0,
    );
    const expenses = ((expensesData ?? []) as { amount: number }[]).reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0,
    );
    const netOf = (rows: { kind: string; amount: number }[] | null) =>
      (rows ?? [])
        .filter((r) => r.kind === "received")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0) -
      (rows ?? [])
        .filter((r) => r.kind === "distributed")
        .reduce((sum, r) => sum + (r.amount ?? 0), 0);
    const zakatNet = netOf(
      zakatData as { kind: string; amount: number }[] | null,
    );
    const ushrNet = netOf(ushrData as { kind: string; amount: number }[] | null);
    return fees + donations + zakatNet + ushrNet - expenses;
  } catch {
    return 0;
  }
}
