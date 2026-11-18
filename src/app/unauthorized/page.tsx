/**
 * مرحلہ 11 — غیر مجاز صارف کی اسکرین
 * گہرا نیوی بلیو پس منظر، سرخ وارننگ، سنہری لاگ آؤٹ بٹن، سبز واٹس ایپ بٹن۔
 * یہ صفحہ صرف لاگ اِن مگر غیر منظور شدہ صارف کو دکھتا ہے — middleware اس کی
 * اجازت دیتا ہے، باقی سب صفحے بند رہتے ہیں۔
 */
import { getMyLanguage } from "@/lib/language";
import UnauthorizedView from "./UnauthorizedView";

export default async function UnauthorizedPage() {
  const lang = await getMyLanguage();
  return <UnauthorizedView lang={lang} />;
}
