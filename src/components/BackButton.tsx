import Link from "next/link";
import { cookies } from "next/headers";
import { BACK_ARROW_SVG, HOME_SVG } from "@/components/icons";
import { t } from "@/i18n/dictionary";

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
 * زبان کوکی سے پڑھی جاتی ہے — root layout ہر درخواست پر getMyLanguage
 * سے کوکی کو پروفائل والی زبان سے ملا دیتا ہے، اس لیے یہاں ڈیٹا بیس
 * کا سوال نہیں ہوتا۔ کوکی نہ ملے تو اردو۔
 */
export default async function BackButton({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  let lang: "ur" | "ar" = "ur";
  try {
    const c = (await cookies()).get("lang")?.value;
    if (c === "ar") lang = "ar";
  } catch {
    /* کوکی نہ پڑھی جا سکے تو اردو */
  }
  const homeLabel = t(lang, "common.home");
  return (
    <>
      <Link
        className={`back-arrow${className ? ` ${className}` : ""}`}
        href={href}
        aria-label="واپس جائیں"
        title="واپس جائیں"
      >
        <span dangerouslySetInnerHTML={{ __html: BACK_ARROW_SVG }} />
      </Link>
      <Link
        className="home-btn"
        href="/"
        aria-label={homeLabel}
        title={homeLabel}
      >
        <span dangerouslySetInnerHTML={{ __html: HOME_SVG }} />
        {homeLabel}
      </Link>
    </>
  );
}
