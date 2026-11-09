/**
 * مرحلہ 3 — Next.js middleware: ہر درخواست پر Supabase سیشن تازہ رکھتا ہے۔
 * اس مرحلے میں یہ کسی صفحے کو بند نہیں کرتا (کوئی redirect نہیں)۔
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
