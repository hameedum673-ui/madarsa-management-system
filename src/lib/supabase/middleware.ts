/**
 * مرحلہ 4 — سیشن تازہ رکھنے کا middleware مددگار + لاگ اِن کی حفاظت (gating)
 * صارف کا فیصلہ: ڈیش بورڈ صرف لاگ اِن والوں کو نظر آئے۔
 * - لاگ اِن نہیں ہے اور صفحہ ‎/login نہیں ہے → ‎/login پر بھیج دیا جاتا ہے۔
 * - لاگ اِن ہے اور صفحہ ‎/login ہے → مین ڈیش بورڈ ‎/ پر بھیج دیا جاتا ہے۔
 * نوٹ: اگر Supabase کی ترتیبات نہ ہوں تو حفاظت چھوڑ دی جاتی ہے تاکہ
 * سائٹ خراب نہ ہو (مرحلہ 3 والا حفاظتی اصول برقرار ہے)۔
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";

  // لاگ اِن نہیں ہے → لاگ اِن صفحے کے سوا ہر صفحہ بند ہے
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // لاگ اِن ہے اور لاگ اِن صفحے پر ہے → سیدھا ڈیش بورڈ پر
  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
