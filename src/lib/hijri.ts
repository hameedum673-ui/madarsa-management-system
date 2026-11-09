/**
 * ہجری تاریخ — کوڈ سے حساب، فون کے براؤزر پر انحصار نہیں
 *
 * مسئلہ: پہلے ہجری تاریخ فون کے Intl (ur-PK-u-ca-islamic) سے بنتی تھی۔
 * کچھ فون کے براؤزر میں اسلامی کیلنڈر کا ڈیٹا نہیں ہوتا، اس لیے وہاں دوسری
 * تاریخ «قبل مسیح» دکھائی دیتی تھی — ہجری نہیں۔
 * حل: مشہور جدولی (Kuwaiti) طریقے سے عیسوی تاریخ کو ہجری میں بدلا جاتا ہے،
 * مہینوں کے نام اردو میں خود لکھے جاتے ہیں۔ یہ ہر براؤزر میں ایک جیسی تاریخ دیتا ہے۔
 * نوٹ: یہ حسابی ہجری تاریخ ہے؛ چاند دیکھنے کے سرکاری اعلان سے ایک دن کا
 * فرق ممکن ہے (جیسے ہر حسابی کیلنڈر میں ہوتا ہے)۔
 * انشانکن: حساب میں ایک دن کا اضافہ کیا گیا ہے تاکہ تاریخ ام القریٰ اور
 * سول اسلامی کیلنڈر کے درمیان آئے — 2025-2027 کے ہفتہ وار نمونے میں یہ
 * دونوں حوالوں سے اکثر بالکل درست اور زیادہ سے زیادہ ایک دن کا فرق رکھتی ہے۔
 */

export const HIJRI_MONTHS_UR = [
  "محرم",
  "صفر",
  "ربیع الاول",
  "ربیع الثانی",
  "جمادی الاول",
  "جمادی الثانی",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذوالقعدہ",
  "ذوالحجہ",
];

/** عیسوی تاریخ (سال، مہینہ، دن) ← جولین دن */
function gregorianToJD(y: number, m: number, d: number): number {
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    d +
    b -
    1524.5
  );
}

/** ہجری تاریخ (سال، مہینہ، دن) ← جولین دن */
function islamicToJD(y: number, m: number, d: number): number {
  return (
    d +
    Math.ceil(29.5 * (m - 1)) +
    (y - 1) * 354 +
    Math.floor((3 + 11 * y) / 30) +
    1948439.5 -
    1
  );
}

/** جولین دن ← ہجری تاریخ */
function jdToIslamic(jd: number): { day: number; month: number; year: number } {
  const j = Math.floor(jd) + 0.5;
  const year = Math.floor((30 * (j - 1948439.5) + 10646) / 10631);
  const firstOfYear = islamicToJD(year, 1, 1);
  const month = Math.min(12, Math.ceil((j - (29 + firstOfYear)) / 29.5) + 1);
  const day = Math.floor(j - islamicToJD(year, month, 1)) + 1;
  return { day, month, year };
}

/** عیسوی تاریخ (سال، مہینہ، دن) ← ہجری تاریخ (ایک دن کی انشانکن کے ساتھ) */
export function gregorianToHijri(
  y: number,
  m: number,
  d: number,
): { day: number; month: number; year: number } {
  return jdToIslamic(gregorianToJD(y, m, d) + 1);
}

/** دی گئی تاریخ کی پاکستان کے وقت کے مطابق ہجری تاریخ — اردو الفاظ میں */
export function hijriTodayUrdu(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const h = gregorianToHijri(get("year"), get("month"), get("day"));
  const num = (n: number) =>
    n.toLocaleString("ur-PK", { useGrouping: false });
  return `${num(h.day)} ${HIJRI_MONTHS_UR[h.month - 1]}، ${num(h.year)}ھ`;
}
