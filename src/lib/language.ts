/**
 * مرحلہ 102 — موجودہ صارف کی زبان
 *
 * درستی 2026-11-14 — مشترکہ فون والا مسئلہ: زبان پہلے صرف فون کی
 * "lang" کوکی سے پڑھی جاتی تھی، اس لیے ایک ہی فون بانٹنے پر دوسرے
 * صارف کو پہلے صارف کی زبان نظر آتی تھی۔
 *
 * ترتیب اب: لاگ اِن صارف کی پروفائل والی زبان سب سے پہلے — اکاؤنٹ
 * ہمیشہ جیتتا ہے۔ اگر فون کی کوکی اس سے مختلف ہو، تو کوکی کو پروفائل
 * والی زبان سے ملا دیا جاتا ہے (اگلی بار کوکی بھی درست ہو)۔ لاگ آؤٹ
 * حالت میں صرف کوکی دیکھی جاتی ہے، پھر اردو۔ migration 054 نہ چلی ہو
 * یا پروفائل والا سوال ناکام ہو تو کوکی والی زبان ملتی ہے — سائٹ نہیں
 * رکتی۔ انگریزی کا UI ابھی نہیں بنا، اس لیے 'en' ملے تو بھی اردو دکھے گی۔
 */
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isLang, type Lang } from "@/i18n/dictionary";

export async function getMyLanguage(): Promise<Lang> {
  let cookieLang: Lang | null = null;
  try {
    const cookieStore = await cookies();
    const c = cookieStore.get("lang")?.value;
    if (c === "ur" || c === "ar") cookieLang = c;
    else if (c === "en") cookieLang = "ur"; // انگریزی کا UI ابھی نہیں بنا
  } catch {
    /* کوکی نہ پڑھی جا سکے تو پروفائل دیکھیں */
  }
  try {
    const supabase = await createClient();
    const mine = await getMyMadrasa(supabase).catch(() => null);
    if (!mine) return cookieLang ?? "ur";
    const { data, error } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", mine.userId)
      .maybeSingle();
    if (error || !data) return cookieLang ?? "ur";
    const l = (data as { language?: string } | null)?.language;
    if (!isLang(l)) return cookieLang ?? "ur";
    const effective: Lang = l === "en" ? "ur" : l;
    // اکاؤنٹ کی زبان کوکی سے مختلف ہو تو کوکی ملا دیں (مشترکہ فون) —
    // اگلی بار کوکی بھی درست ہوگی۔ نہ لگ سکے تو اگلی درخواست پر دوبارہ۔
    if (cookieLang !== effective) {
      try {
        const cookieStore = await cookies();
        cookieStore.set("lang", effective, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
      } catch {
        /* اگلی درخواست پر دوبارہ کوشش ہوگی */
      }
    }
    return effective;
  } catch {
    return cookieLang ?? "ur";
  }
}
