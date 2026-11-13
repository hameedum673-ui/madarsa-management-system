/**
 * مرحلہ 4 — Next.js middleware: ہر درخواست پر Supabase سیشن تازہ رکھتا ہے
 * اور لاگ اِن کی حفاظت کرتا ہے — ڈیش بورڈ صرف لاگ اِن والوں کو نظر آتا ہے۔
 */
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // مرحلہ 76 — manifest.json اور sw.js لاگ ان کے بغیر کھلنے چاہئیں
    // (براؤزر انسٹال کے لیے ان کو بغیر سیشن کے پڑھتا ہے)۔
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
