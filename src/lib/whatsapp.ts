/**
 * مرحلہ 44 — WhatsApp پیغامات (wa.me لنک)
 * سسٹم خود پیغام نہیں بھیجتا — بٹن دبانے سے WhatsApp کھلتا ہے، سرپرست
 * کا نمبر اور پیغام پہلے سے لکھا ہوتا ہے؛ بھیجنے کا بٹن صارف خود
 * WhatsApp میں دباتا ہے۔
 */
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const MADRASA_NAME_FALLBACK =
  "مدرسہ سیدہ عائشہ صدیقہ (رضی اللہ عنہا) للبنات";

/**
 * فون نمبر کو WhatsApp والی شکل میں کریں (92 + 10 ہندسے)
 * 03XX... → 92XXXXXXXXXX، 92XX... → ویسے ہی — نہ ہو سکے تو null
 */
export function normalizePhoneForWhatsApp(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (/^92\d{10}$/.test(digits)) return digits;
  if (/^0\d{10}$/.test(digits)) return `92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `92${digits}`;
  return null;
}

/**
 * مرحلہ 46 — پیغام بھیجنے والا نمبر: پہلے واٹس ایپ نمبر، نہ ہو تو
 * رابطہ نمبر (پرانے ریکارڈ کا کام رُکے نہیں)
 */
export function messagePhone(
  guardianPhone: string | null | undefined,
  whatsappNumber: string | null | undefined,
): string | null {
  const preferred =
    (whatsappNumber ?? "").trim() || (guardianPhone ?? "").trim();
  return preferred || null;
}

/** WhatsApp کھولنے والا لنک — نمبر درست نہ ہو تو null */
export function whatsappLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizePhoneForWhatsApp(phone);
  if (!normalized || !message.trim()) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

/** مدرسے کا نام (ڈیٹا بیس سے؛ نہ ملے تو پرانا نام) */
export async function getMadrasaNameForMessage(
  supabase: ServerClient,
): Promise<string> {
  try {
    const mine = await getMyMadrasa(supabase);
    if (!mine) return MADRASA_NAME_FALLBACK;
    const { data } = await supabase
      .from("madrasas")
      .select("name")
      .eq("id", mine.madrasaId)
      .single();
    return (data as { name?: string } | null)?.name ?? MADRASA_NAME_FALLBACK;
  } catch {
    return MADRASA_NAME_FALLBACK;
  }
}

function money(value: number): string {
  return `${value.toLocaleString("ur-PK")} روپے`;
}

/** بقایا فیس کی یاد دہانی کا پیغام */
export function feeReminderMessage(args: {
  madrasaName: string;
  studentName: string;
  monthUrdu: string;
  expected: number;
  paid: number;
}): string {
  const balance = args.expected - args.paid;
  return (
    `السلام علیکم ورحمة الله وبركاته! ${args.madrasaName} کی طرف سے اطلاع ہے ` +
    `کہ طالبہ ${args.studentName} کی ${args.monthUrdu} کی فیس ${money(args.expected)} ہے۔ ` +
    `ادا شدہ: ${money(args.paid)}۔ بقایا: ${money(balance)}۔ ` +
    `براہِ کرم بقایا فیس جلد ادا کر دیں۔ جزاک الله خیرا!`
  );
}

/** امتحان کے نتیجے کا پیغام */
export function examResultMessage(args: {
  madrasaName: string;
  studentName: string;
  examName: string;
  obtained: number;
  possible: number;
  percentage: number;
  grade: string;
}): string {
  return (
    `السلام علیکم ورحمة الله وبركاته! ${args.madrasaName} کی طرف سے طالبہ ` +
    `${args.studentName} کے امتحان ${args.examName} کا نتیجہ: کل نمبر ` +
    `${args.obtained.toLocaleString("ur-PK")} / ${args.possible.toLocaleString("ur-PK")}، ` +
    `فیصد ${args.percentage.toLocaleString("ur-PK", { maximumFractionDigits: 1 })}٪، ` +
    `درجہ ${args.grade}۔ مبارک ہو!`
  );
}

/** داخلہ منظور ہونے کا پیغام */
export function admissionApprovedMessage(args: {
  madrasaName: string;
  applicantName: string;
  departmentLabel: string;
  className: string;
  registrationNumber: string;
}): string {
  return (
    `السلام علیکم ورحمة الله وبركاته! ${args.madrasaName} میں ${args.applicantName} ` +
    `کا داخلہ منظور ہو گیا ہے — شعبہ: ${args.departmentLabel}، جماعت: ${args.className}۔ ` +
    `رجسٹریشن نمبر: ${args.registrationNumber}۔ مبارک ہو!`
  );
}
