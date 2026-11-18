/** تھیم 3 — دن/رات کا انتخاب (نمونه 3: گہرا سمندری و سنہری)
 *
 * صرف کوکی "theme" سے پڑھا جاتا ہے — فی ڈیوائس محفوظ رہتا ہے،
 * کوئی SQL / migration / پروفائل کالم نہیں۔ قدر "light" یا "dark"؛
 * کچھ اور ہو یا کوکی نہ ہو تو دن والا انداز (light)۔
 */
import { cookies } from "next/headers";

export type Theme = "light" | "dark";

export async function getMyTheme(): Promise<Theme> {
  try {
    const v = (await cookies()).get("theme")?.value;
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
