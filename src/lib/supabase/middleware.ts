/**
 * مرحلہ 11 — سیشن تازہ رکھنے کا middleware مددگار + لاگ اِن اور منظوری کی حفاظت
 * صارف کا فیصلہ: ڈیش بورڈ صرف لاگ اِن اور منظور شدہ صارفین کو نظر آئے۔
 * - لاگ اِن نہیں ہے اور صفحہ ‎/login یا ‎/auth/callback نہیں ہے → ‎/login۔
 * - لاگ اِن ہے مگر منظور شدہ نہیں ہے → ‎/unauthorized (نیا صارف خودکار طور پر
 *   "زیرِ منظوری" درج ہو جاتا ہے تاکہ ایڈمن درخواست دیکھ سکے)۔
 * - ایڈمن (super_admin) ہمیشہ منظور شدہ ہے — اسے بار بار منظوری نہیں چاہیے۔
 * - منظور شدہ صارف کا profile نہ ہو تو اگلے لاگ اِن پر خود بن جاتا ہے۔
 * منظوری کی جانچ سرور پر ہوتی ہے (محفوظ SQL فنکشن)؛ براہِ راست لنک کھولنے
 * پر بھی یہی جانچ چلتی ہے۔
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
  const isUnauthorizedPage = pathname === "/unauthorized";
  const isAuthCallback =
    pathname === "/auth/callback" || pathname.startsWith("/auth/");

  // لاگ اِن نہیں ہے → لاگ اِن اور auth callback کے سوا ہر صفحہ بند ہے
  if (!user) {
    if (isLoginPage || isAuthCallback) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // لاگ اِن ہے اور auth callback پر ہے → کوڈ بدلنے دیں، جانچ اگلے صفحے پر ہوگی
  if (isAuthCallback) return supabaseResponse;

  // منظوری کی جانچ — پہلے ایڈمن کا کردار (اس کے لیے نئے فنکشن کی ضرورت نہیں)
  let approved = false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if ((profile as { role?: string } | null)?.role === "super_admin") {
    approved = true;
  } else {
    const { data: status, error } = await supabase.rpc("my_approval_status");
    if (!error && status === "approved") {
      approved = true;
      // منظور شدہ صارف کا profile نہ ہو تو خود بنا لیں (غلطی ہو تو نظر انداز)
      await supabase.rpc("ensure_my_profile");
    } else if (!error && status === "none") {
      // پہلی بار آیا ہے — "زیرِ منظوری" درج کر دیں تاکہ ایڈمن دیکھ سکے
      await supabase.rpc("request_access");
      approved = false;
    } else {
      // 'pending' / 'disabled' — یا فنکشن نہ چلا (migration ابھی نہیں چلی)
      // دونوں صورتوں میں غیر ایڈمن صارف بند رہے گا (محفوظ رخ)
      approved = false;
    }
  }

  // منظور شدہ نہیں ہے → غیر مجاز صفحے کے سوا ہر صفحہ بند ہے
  if (!approved) {
    if (isUnauthorizedPage) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // منظور شدہ ہے اور لاگ اِن یا غیر مجاز صفحے پر ہے → سیدھا ڈیش بورڈ پر
  if (isLoginPage || isUnauthorizedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
