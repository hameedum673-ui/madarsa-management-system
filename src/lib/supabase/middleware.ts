/**
 * مرحلہ 3 — سیشن تازہ رکھنے کا middleware مددگار
 * ہر درخواست پر Supabase سیشن چیک/تازہ ہوتا ہے تاکہ لاگ اِن قائم رہے۔
 * نوٹ: اس مرحلے میں کوئی صفحہ لاگ اِن کے پیچھے بند نہیں کیا گیا —
 * ڈیش بورڈ سب کو نظر آتا رہے یا صرف لاگ اِن والوں کو، یہ فیصلہ صارف کرے گا۔
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // اگر Supabase کی ترتیبات ابھی نہیں لگائی گئیں تو سیشن چیک چھوڑ دیں —
  // ایپ عام طریقے سے چلتی رہے، کوئی صفحہ خراب نہ ہو۔
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // سیشن تازہ کرنا — اہم: getUser() ضرور چلائیں، صرف getSession() کافی نہیں۔
  await supabase.auth.getUser();

  return supabaseResponse;
}
