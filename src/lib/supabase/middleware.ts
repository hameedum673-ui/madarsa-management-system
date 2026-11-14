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

  // مرحلہ 67 — مہمان (گمنام صارف): پہلے profile بنائیں، پھر حالت جانچیں۔
  // مہمان کو منظوری کی ضرورت نہیں — اس کی جگہ وقت کی حد ہے۔
  let approved = false;
  let isAdmin = false;
  if (user.is_anonymous) {
    await supabase.rpc("ensure_my_guest_profile");
    const { data: guestStatus } = await supabase.rpc("my_guest_status");
    if (guestStatus === "active") {
      approved = true;
    } else {
      // وقت ختم یا ڈیمو بند — لاگ ان والے صفحے پر ہی رہیں تاکہ
      // صفحہ خود لاگ آؤٹ کر دے اور پیغام دکھائے
      if (isLoginPage) return supabaseResponse;
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set(
        "guest",
        guestStatus === "expired" ? "expired" : "off",
      );
      return NextResponse.redirect(url);
    }
  } else {
    // منظوری کی جانچ — پہلے ایڈمن کا کردار (اس کے لیے نئے فنکشن کی ضرورت نہیں)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if ((profile as { role?: string } | null)?.role === "super_admin") {
      approved = true;
      isAdmin = true;
    } else {
      const { data: status, error } = await supabase.rpc(
        "my_approval_status",
      );
      if (!error && status === "approved") {
        approved = true;
        // منظور شدہ صارف کا profile نہ ہو تو خود بنا لیں (غلطی ہو تو نظر انداز)
        await supabase.rpc("ensure_my_profile");
        // مرحلہ 25 — اگر صارف کا مدرسہ کسی اور سے جڑا ہوا ہے تو اسے اپنا
        // الگ مدرسہ مل جائے (غلطی ہو تو نظر انداز — پرانا کام نہیں رکتا)
        await supabase.rpc("ensure_my_workspace");
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
  }

  // منظور شدہ نہیں ہے → غیر مجاز صفحے کے سوا ہر صفحہ بند ہے
  if (!approved) {
    if (isUnauthorizedPage) return supabaseResponse;
    const url = request.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // مرحلہ 43 — 2FA کی جانچ: جس کا 2FA فعال ہے، اس کی تصدیق (aal2) کے
  // بغیر کوئی صفحہ نہیں کھلتا — وہ /auth/mfa-verify پر جائے گا۔
  // جانچ ناکام ہو تو محفوظ رخ: پرانا کام نہیں رکتا۔
  const isMfaVerifyPage = pathname === "/auth/mfa-verify";
  try {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfa =
      !!aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2";
    if (needsMfa && !isMfaVerifyPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/mfa-verify";
      return NextResponse.redirect(url);
    }
  } catch {
    /* 2FA کی جانچ نہ ہو تو پرانا کام ویسے ہی چلتا ہے */
  }

  // منظور شدہ ہے اور لاگ اِن یا غیر مجاز صفحے پر ہے → سیدھا ڈیش بورڈ پر
  if (isLoginPage || isUnauthorizedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // مرحلہ 26 — شعبے کی اجازت (صرف عام صارف؛ ایڈمن پر کوئی پابندی نہیں)
  // براہِ راست لنک کھولنے پر بھی سرور روکتا ہے — صرف بٹن چھپانا کافی نہیں۔
  if (!isAdmin && pathname.startsWith("/departments/")) {
    const slug = pathname.split("/")[2] ?? "";
    // "صارفین اور اکاؤنٹس" اور "اختیارات اور اجازتیں" صرف نظام کے ایڈمن
    // کے لیے ہیں؛ ان کا حب، "تنخواہیں" اور "عملے کے ارکان" مدرسے کے مالک
    // کے لیے بھی کھلے ہیں (حصہ 4 کی درستگی — مالک سپر ایڈمن نہیں ہوتا)
    const { data: ownerData } = await supabase.rpc("am_i_madrasa_owner");
    const isOwner = ownerData === true;
    if (
      slug === "users" ||
      slug === "permissions" ||
      (!isOwner &&
        (slug === "users-permissions" ||
          slug === "salaries" ||
          slug === "staff-members"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    // مرحلہ 47 — ملا ہوا بٹن: طلبہ یا داخلے میں سے ایک کی بھی اجازت
    // ہو تو کھلتا ہے؛ دونوں بند ہوں تو ڈیش بورڈ پر واپس۔
    if (slug === "admissions-students") {
      // مرحلہ 93 — دونوں سوال ایک ساتھ (پہلے ایک کے بعد ایک تھے)
      const [{ data: studentsAllowed }, { data: admissionsAllowed }] =
        await Promise.all([
          supabase.rpc("my_module_allowed", { p_module: "students" }),
          supabase.rpc("my_module_allowed", { p_module: "admissions" }),
        ]);
      if (studentsAllowed === false && admissionsAllowed === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    // مرحلہ 78 — داخلے، طلبہ اور شناختی کارڈ کا حب: طلبہ، داخلے
    // یا شناختی کارڈ میں سے ایک کی بھی اجازت ہو تو کھلتا ہے؛ تینوں
    // بند ہوں تو ڈیش بورڈ پر واپس۔
    if (slug === "students-idcards") {
      // مرحلہ 93 — تینوں سوال ایک ساتھ
      const [
        { data: studentsAllowed },
        { data: admissionsAllowed },
        { data: idcardsAllowed },
      ] = await Promise.all([
        supabase.rpc("my_module_allowed", { p_module: "students" }),
        supabase.rpc("my_module_allowed", { p_module: "admissions" }),
        supabase.rpc("my_module_allowed", { p_module: "idcards" }),
      ]);
      if (
        studentsAllowed === false &&
        admissionsAllowed === false &&
        idcardsAllowed === false
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    // مرحلہ 57 — حاضری کا حب: طلبہ یا اساتذہ کی حاضری میں سے ایک
    // کی بھی اجازت ہو تو کھلتا ہے؛ دونوں بند ہوں تو ڈیش بورڈ پر
    // واپس۔
    if (slug === "attendance") {
      // مرحلہ 93 — دونوں سوال ایک ساتھ
      const [{ data: attStudentsAllowed }, { data: attTeachersAllowed }] =
        await Promise.all([
          supabase.rpc("my_module_allowed", { p_module: "att-students" }),
          supabase.rpc("my_module_allowed", { p_module: "att-teachers" }),
        ]);
      if (attStudentsAllowed === false && attTeachersAllowed === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    // مرحلہ 72 — وظائف + طلبہ کے اخراجات کا حب: دونوں میں سے ایک
    // کی بھی اجازت ہو تو کھلتا ہے؛ دونوں بند ہوں تو ڈیش بورڈ پر
    // واپس۔
    if (slug === "welfare-expenses") {
      // مرحلہ 93 — دونوں سوال ایک ساتھ
      const [{ data: welfareAllowed }, { data: studentExpAllowed }] =
        await Promise.all([
          supabase.rpc("my_module_allowed", { p_module: "welfare" }),
          supabase.rpc("my_module_allowed", { p_module: "student-exp" }),
        ]);
      if (welfareAllowed === false && studentExpAllowed === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    // مرحلہ 56 — رپورٹس کا حب: ماہانہ، سالانہ، مالیاتی رپورٹس یا
    // رپورٹس میں سے ایک کی بھی اجازت ہو تو کھلتا ہے؛ چاروں بند
    // ہوں تو ڈیش بورڈ پر واپس۔
    if (slug === "reports-hub") {
      // مرحلہ 93 — چاروں سوال ایک ساتھ
      const [
        { data: monthlyAllowed },
        { data: yearlyAllowed },
        { data: finReportsAllowed },
        { data: reportsAllowed },
      ] = await Promise.all([
        supabase.rpc("my_module_allowed", { p_module: "monthly" }),
        supabase.rpc("my_module_allowed", { p_module: "yearly" }),
        supabase.rpc("my_module_allowed", { p_module: "fin-reports" }),
        supabase.rpc("my_module_allowed", { p_module: "reports" }),
      ]);
      if (
        monthlyAllowed === false &&
        yearlyAllowed === false &&
        finReportsAllowed === false &&
        reportsAllowed === false
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    // مرحلہ 48 — آمدنی کا حب: صرف /departments/income (حب) پر فیس،
    // زکوٰۃ، عشر یا عطیات میں سے ایک کی بھی اجازت ہو تو کھلتا ہے؛
    // نیچے والے صفحے (/departments/income/fees وغیرہ) پر صرف فیس
    // کی اجازت چاہیے — اس لیے حب کے لیے عام جانچ نہیں چلتی۔
    if (slug === "income" && pathname === "/departments/income") {
      // مرحلہ 93 — چاروں سوال ایک ساتھ
      const [
        { data: incomeAllowed },
        { data: zakatAllowed },
        { data: ushrAllowed },
        { data: donationsAllowed },
      ] = await Promise.all([
        supabase.rpc("my_module_allowed", { p_module: "income" }),
        supabase.rpc("my_module_allowed", { p_module: "zakat" }),
        supabase.rpc("my_module_allowed", { p_module: "ushr" }),
        supabase.rpc("my_module_allowed", { p_module: "donations" }),
      ]);
      if (
        incomeAllowed === false &&
        zakatAllowed === false &&
        ushrAllowed === false &&
        donationsAllowed === false
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
    // مرحلہ 49 — ملا ہوا صفحہ: /departments/income/funds پر زکوٰۃ،
    // عشر یا عطیات میں سے ایک کی بھی اجازت ہو تو کھلتا ہے۔
    else if (
      slug === "income" &&
      pathname.startsWith("/departments/income/funds")
    ) {
      // مرحلہ 93 — تینوں سوال ایک ساتھ
      const [
        { data: zakatAllowed },
        { data: ushrAllowed },
        { data: donationsAllowed },
      ] = await Promise.all([
        supabase.rpc("my_module_allowed", { p_module: "zakat" }),
        supabase.rpc("my_module_allowed", { p_module: "ushr" }),
        supabase.rpc("my_module_allowed", { p_module: "donations" }),
      ]);
      if (
        zakatAllowed === false &&
        ushrAllowed === false &&
        donationsAllowed === false
      ) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    } else if (slug) {
      const { data: allowed } = await supabase.rpc(
        "my_module_allowed",
        { p_module: slug },
      );
      // فنکشن نہ چلا (migration ابھی نہیں چلی) تو اجازت ہے — پرانا کام نہیں رکتا
      if (allowed === false) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
