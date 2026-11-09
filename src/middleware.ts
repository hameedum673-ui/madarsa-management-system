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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
