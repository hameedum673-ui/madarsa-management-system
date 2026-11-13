/**
 * مرحلہ 30 — بیک اپ ڈاؤن لوڈ (Route Handler)
 * اپنے مدرسے کا سارا ڈیٹا ایک JSON فائل کے طور پر ڈاؤن لوڈ ہوتا ہے۔
 * RLS خود یقین دلاتی ہے کہ صرف اپنا ڈیٹا آئے — دوسرے صارف کا ڈیٹا کبھی نہیں۔
 * حصہ 4 — ڈاؤن لوڈ صرف مدرسے کے مالک کے لیے ہے (عملہ بیک اپ نہیں لے سکتا —
 * اس کے ہاتھ میں پورے مدرسے کا ڈیٹا آ جاتا)۔ لاگ اِن اور منظوری کی جانچ
 * middleware پہلے ہی کر چکا ہوتا ہے۔
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin } from "@/lib/approval";
import { todayInKarachi } from "@/lib/attendance";

export const dynamic = "force-dynamic";

/** اپنے مدرسے کی تمام میزیں — فعال اور منسوخ ریکارڈ سمیت */
const OWN_TABLES = [
  "madrasas",
  "madrasa_profile",
  "students",
  "teachers",
  "staff",
  "classes",
  "student_attendance",
  "teacher_attendance",
  "fee_payments",
  "fee_schedule",
  "expenses",
  "salary_payments",
  "donations",
  "zakat_records",
  "ushr_records",
  "welfare_records",
  "student_expenses",
  "exams",
  "exam_results",
  "hifz_progress",
  "month_closings",
  "admissions",
  "notices",
  "documents",
  "document_files",
  "audit_log",
] as const;

/** صرف ایڈمن کی میزیں */
const ADMIN_TABLES = [
  "approved_users",
  "user_permissions",
  "user_sections",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "لاگ اِن نہیں ہے۔" }, { status: 401 });
  }
  const mine = await getMyMadrasa(supabase);
  if (!mine) {
    return NextResponse.json({ error: "لاگ اِن نہیں ہے۔" }, { status: 401 });
  }
  const admin = await isAppAdmin(supabase);
  // حصہ 4 — بیک اپ صرف مالک ڈاؤن لوڈ کر سکتا ہے
  if (!admin) {
    return NextResponse.json(
      { error: "صرف مدرسے کا مالک بیک اپ ڈاؤن لوڈ کر سکتا ہے۔" },
      { status: 403 },
    );
  }

  const tables: Record<string, unknown[]> = {};
  for (const table of OWN_TABLES) {
    const { data } = await supabase.from(table).select("*");
    tables[table] = (data ?? []) as unknown[];
  }
  if (admin) {
    for (const table of ADMIN_TABLES) {
      const { data } = await supabase.from(table).select("*");
      tables[table] = (data ?? []) as unknown[];
    }
  }

  const payload = {
    app: "madrasa-management-system",
    exported_at: new Date().toISOString(),
    madrasa_id: mine.madrasaId,
    tables,
  };

  // مرحلہ 80 — ڈاؤن لوڈ کا ریکارڈ (ناکام ہو تو بھی فائل ملے گی —
  // میز نہ بنی ہو تو یہ خاموشی سے ناکام ہوتا ہے، ڈاؤن لوڈ نہیں رکتا)
  await supabase.from("backup_log").insert({
    madrasa_id: mine.madrasaId,
    downloaded_by: user.id,
  });

  const filename = `madrasa-backup-${todayInKarachi()}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
