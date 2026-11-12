/**
 * مرحلہ 39 — پورا سال بند کرنا (Server Action)
 * سال کے 12 مہینے ایک ساتھ بند ہوتے ہیں؛ ہر مہینہ الگ سے دوبارہ
 * کھولا جا سکتا ہے (ماہانہ حسابات والے صفحے سے)۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe, MODULE_DENIED_ERROR } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import { upsertClosing } from "@/lib/monthClosing";

type ActionResult = { ok: true } | { error: string };

const MONTHS = [
  "01", "02", "03", "04", "05", "06",
  "07", "08", "09", "10", "11", "12",
];

/** پورا سال بند کریں — 12 مہینے ایک ساتھ */
export async function closeYear(year: string): Promise<ActionResult> {
  if (!/^\d{4}$/.test(year)) {
    return { error: "سال درست نہیں ہے۔" };
  }
  const y = Number(year);
  if (y < 2000 || y > 2100) {
    return { error: "سال درست نہیں ہے۔" };
  }

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "yearly"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  for (const m of MONTHS) {
    const saved = await upsertClosing(
      supabase,
      mine.madrasaId,
      `${year}-${m}`,
      true,
      mine.userId,
    );
    if ("error" in saved) return { error: saved.error };
  }

  try {
    await supabase.from("audit_log").insert({
      madrasa_id: mine.madrasaId,
      user_id: mine.userId,
      action: "year_closed",
      details: { year },
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }

  revalidatePath("/departments/monthly");
  revalidatePath("/departments/yearly");
  revalidatePath("/");
  return { ok: true };
}
