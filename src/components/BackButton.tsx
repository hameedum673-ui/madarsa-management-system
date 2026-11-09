import Link from "next/link";
import { BACK_ARROW_SVG } from "@/components/icons";

/**
 * واپس جانے کا تیر — دوست کی تجویز (9 نومبر 2026):
 * ہر صفحے کے نیچے لمبا «واپس مین ڈیش بورڈ» لکھنے کے بجائے، صفحے کے اوپر
 * کونے میں صرف تیر کا نشان۔ منزل وہی رہتی ہے جو پہلے لفظوں والے بٹن کی تھی۔
 */
export default function BackButton({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      className={`back-arrow${className ? ` ${className}` : ""}`}
      href={href}
      aria-label="واپس جائیں"
      title="واپس جائیں"
    >
      <span dangerouslySetInnerHTML={{ __html: BACK_ARROW_SVG }} />
    </Link>
  );
}
