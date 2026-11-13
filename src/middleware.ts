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
    // مرحلہ 83 — کرون راستہ (/api/cron/*) بھی middleware سے باہر ہے —
    // اس کی اپنی حفاظت ہے (Bearer CRON_SECRET)؛ ورنہ کرون لاگ ان صفحے
    // پر واپس جاتا اور بیک اپ کبھی نہیں بنتا۔
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
