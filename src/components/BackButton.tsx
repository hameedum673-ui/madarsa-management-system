import Link from "next/link";
import { BACK_ARROW_SVG, HOME_SVG } from "@/components/icons";

/**
 * واپس جانے کا تیر — دوست کی تجویز (9 نومبر 2026):
 * ہر صفحے کے نیچے لمبا «واپس مین ڈیش بورڈ» لکھنے کے بجائے، صفحے کے اوپر
 * کونے میں صرف تیر کا نشان۔ منزل وہی رہتی ہے جو پہلے لفظوں والے بٹن کی تھی۔
 *
 * ہوم بٹن (16 نومبر 2026) — صارف کی پریشانی: تیر صرف ایک درجہ پیچھے
 * جاتا ہے (تفصیل → فہرست → مرکز → ڈیش بورڈ)، اس لیے ایک کے بعد ایک
 * جانا پڑتا ہے۔ تیر کے ساتھ ہی گھر والا بٹن لگا دیا — ایک ٹیپ میں
 * سیدھا مین ڈیش بورڈ، چاہے آپ کتنے ہی صفحے اندر ہوں۔
 *
 * درستی (16 نومبر 2026، دوپہر) — صارف کی شکایت: ہوم بٹن پر لفظ لکھا
 * تھا ("مین ڈیش بورڈ" / "لوحة التحكم الرئيسية")، اس لیے اردو کرنے
 * پر بھی عربی دکھتا رہا۔ حل: بٹن پر کوئی لفظ ہی نہیں — صرف گھر کا
 * ہلکا سا آئکن (پروفیشنل ہوم پیج والا)۔ لفظ نہ ہو تو زبان کا مسئلہ
 * ہی ختم۔ ترتیب بھی بدلی: ہوم بٹن پہلے (اصل کونے پر)، تیر اس کے
 * ساتھ بعد میں۔
 */
export default function BackButton({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <>
      <Link
        className="home-btn"
        href="/"
        aria-label="Home"
        title="Home"
      >
        <span dangerouslySetInnerHTML={{ __html: HOME_SVG }} />
      </Link>
      <Link
        className={`back-arrow${className ? ` ${className}` : ""}`}
        href={href}
        aria-label="واپس جائیں"
        title="واپس جائیں"
      >
        <span dangerouslySetInnerHTML={{ __html: BACK_ARROW_SVG }} />
      </Link>
    </>
  );
}
