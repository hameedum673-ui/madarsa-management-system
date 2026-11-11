/**
 * مرحلہ 39 — مہینہ بند کرنا / دوبارہ کھولنا (Server Actions)
 * بندش صرف اپنے مدرسے کے مہینے پر لاگو ہوتی ہے؛ آڈٹ لاگ میں درج ہوتی ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isValidMonth } from "@/lib/fees";
import { upsertClosing } from "@/lib/monthClosing";

type ActionResult = { ok: true } | { error: string };

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

async function setClosed(month: string, closed: boolean): Promise<ActionResult> {
  if (!isValidMonth(month)) {
    return { error: "مہینہ درست نہیں ہے۔" };
  }
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  const saved = await upsertClosing(
    supabase,
    mine.madrasaId,
    month,
    closed,
    mine.userId,
  );
  if ("error" in saved) return { error: saved.error };

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    closed ? "month_closed" : "month_reopened",
    { month },
  );

  revalidatePath("/departments/monthly");
  revalidatePath("/departments/yearly");
  revalidatePath("/");
  return { ok: true };
}

/** مہینہ بند کریں — اس کے بعد اس مہینے میں کوئی مالیاتی اندراج نہیں ہوگا */
export async function closeMonth(month: string): Promise<ActionResult> {
  return setClosed(month, true);
}

/** بند مہینہ دوبارہ کھولیں (غلطی درست کرنے کے لیے) */
export async function reopenMonth(month: string): Promise<ActionResult> {
  return setClosed(month, false);
}
