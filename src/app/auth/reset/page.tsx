/**
 * مرحلہ 33 — پاس ورڈ بدلنے کا صفحہ (ای میل والے لنک سے)
 * ای میل والا لنک /auth/callback?next=/auth/reset پر آتا ہے؛ callback
 * کوڈ کو سیشن میں بدلتا ہے، پھر یہ صفحہ نیا پاس ورڈ لگاتا ہے۔
 * یہ صفحہ /auth/* کے نیچے ہے، اس لیے middleware اسے بغیر منظوری کی
 * جانچ کے جانے دیتا ہے — ورنہ پاس ورڈ بدلنے سے پہلے ہی صارف رک جاتا۔
 */
import { getMyLanguage } from "@/lib/language";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const lang = await getMyLanguage();
  return <ResetPasswordForm lang={lang} />;
}
