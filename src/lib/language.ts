/**
 * مرحلہ 102 — موجودہ صارف کی زبان
 *
 * ترتیب: پہلے "lang" کوکی (زبان بدلتے ہی لگ جاتی ہے — ڈیٹا بیس کا سوال
 * نہیں چاہیے)، پھر پروفائل کا language خانہ (نئی ڈیوائس پر بھی پسند
 * ساتھ رہے)، پھر اردو۔ migration 054 نہ چلی ہو تو پروفائل والا سوال
 * ناکام ہوتا ہے اور اردو ملتی ہے — سائٹ نہیں رکتی۔
 * انگریزی کا UI ابھی نہیں بنا، اس لیے 'en' ملے تو بھی اردو دکھے گی۔
 */
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isLang, type Lang } from "@/i18n/dictionary";

export async function getMyLanguage(): Promise<Lang> {
  try {
    const cookieStore = await cookies();
    const c = cookieStore.get("lang")?.value;
    if (c === "ur" || c === "ar") return c;
    if (c === "en") return "ur"; // انگریزی کا UI ابھی نہیں بنا
  } catch {
    /* کوکی نہ پڑھی جا سکے تو پروفائل دیکھیں */
  }
  try {
    const supabase = await createClient();
    const mine = await getMyMadrasa(supabase).catch(() => null);
    if (!mine) return "ur";
    const { data, error } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", mine.userId)
      .maybeSingle();
    if (error || !data) return "ur";
    const l = (data as { language?: string } | null)?.language;
    if (isLang(l)) {
      return l === "en" ? "ur" : l;
    }
    return "ur";
  } catch {
    return "ur";
  }
}
