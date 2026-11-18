/**
 * مرحلہ 43 — لاگ اِن کے دوسرے قدم کی تصدیق (کلائنٹ)
 * پاس ورڈ (یا گوگل) کے بعد یہ صفحہ کھلتا ہے — Authenticator ایپ کا 6
 * ہندسوں والا کوڈ ڈالیں۔ کوڈ درست ہو تو ڈیش بورڈ کھل جائے گا۔
 * اگر 2FA فعال ہی نہیں ہے، یا تصدیق پہلے ہو چکی ہے، تو سیدھا ڈیش بورڈ۔
 */
import { getMyLanguage } from "@/lib/language";
import MfaVerifyForm from "./MfaVerifyForm";

export default async function MfaVerifyPage() {
  const lang = await getMyLanguage();
  return <MfaVerifyForm lang={lang} />;
}
