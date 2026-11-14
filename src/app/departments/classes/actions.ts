/**
 * مرحلہ 14 — جماعتوں کے Server Actions (اضافہ / تبدیلی)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * جماعت کبھی حذف نہیں ہوتی — غیر فعال صرف status سے ہوتی ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
} from "@/lib/permissions";
import {
  DEPARTMENT_IDS,
  SECTION_IDS,
  getMyMadrasa,
  type DepartmentId,
  type SectionId,
} from "@/lib/students";
import type { ClassStatus } from "@/lib/classes";
import { isLang, t, type Lang } from "@/i18n/dictionary";

/** مرحلہ 105 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface ClassFields {
  name: string;
  department: DepartmentId;
  section: SectionId;
  sortOrder: number;
}

/** فارم کی جانچ — غلط ہو تو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
  lang: Lang,
): { fields: ClassFields } | { error: string } {
  const name = clean(formData.get("name"), 100);
  const department = clean(formData.get("department"), 20);
  const section = clean(formData.get("section"), 20);
  const sortOrderRaw = clean(formData.get("sort_order"), 10);
  const sortOrder = Number(sortOrderRaw);

  if (!name) return { error: t(lang, "class.err.name_required") };
  if (!DEPARTMENT_IDS.includes(department as DepartmentId))
    return { error: t(lang, "student.err.dept_invalid") };
  if (!SECTION_IDS.includes(section as SectionId))
    return { error: t(lang, "student.err.section_invalid") };
  if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 999)
    return { error: t(lang, "class.err.sort_order") };

  return {
    fields: {
      name,
      department: department as DepartmentId,
      section: section as SectionId,
      sortOrder,
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

/** نئی جماعت شامل کریں */
export async function addClass(formData: FormData): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "classes"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: t(lang, "student.err.section_denied") };

  const { data, error } = await supabase
    .from("classes")
    .insert({
      madrasa_id: mine.madrasaId,
      name: f.name,
      department: f.department,
      section: f.section,
      sort_order: f.sortOrder,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "student.err.save_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "class_created", {
    class_id: data.id as string,
    name: f.name,
  });

  revalidatePath("/departments/classes");
  revalidatePath("/");
  return { ok: true };
}

/** جماعت کا ریکارڈ تبدیل کریں — مدرسہ کبھی نہیں بدلتا */
export async function updateClass(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const lang = formLang(formData);
  const checked = validateFields(formData, lang);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "inactive")
    return { error: t(lang, "class.err.status_invalid") };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  if (!(await isModuleAllowedForMe(supabase, "classes"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // مرحلہ 54 — بند شعبے میں ریکارڈ درج نہیں ہو سکے گا
  const allowedSections = await getMyAllowedSections(supabase);
  if (!allowedSections.has(f.section))
    return { error: t(lang, "student.err.section_denied") };

  // RLS خود یقین دلاتی ہے کہ یہ جماعت اسی مدرسے کی ہے
  const { data, error } = await supabase
    .from("classes")
    .update({
      name: f.name,
      department: f.department,
      section: f.section,
      sort_order: f.sortOrder,
      status: status as ClassStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .select("id")
    .single();

  if (error || !data) {
    return { error: t(lang, "student.err.update_failed") };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "class_updated", {
    class_id: data.id as string,
    name: f.name,
  });

  revalidatePath("/departments/classes");
  revalidatePath(`/departments/classes/${id}`);
  revalidatePath("/");
  return { ok: true };
}
