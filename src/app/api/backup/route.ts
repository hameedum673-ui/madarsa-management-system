/**
 * مرحلہ 30 — بیک اپ ڈاؤن لوڈ (Route Handler)
 * اپنے مدرسے کا سارا ڈیٹا ایک JSON فائل کے طور پر ڈاؤن لوڈ ہوتا ہے۔
 * RLS خود یقین دلاتی ہے کہ صرف اپنا ڈیٹا آئے — دوسرے صارف کا ڈیٹا کبھی نہیں۔
 * حصہ 4 — ڈاؤن لوڈ صرف مدرسے کے مالک کے لیے ہے (عملہ بیک اپ نہیں لے سکتا —
 * اس کے ہاتھ میں پورے مدرسے کا ڈیٹا آ جاتا)۔ لاگ اِن اور منظوری کی جانچ
 * middleware پہلے ہی کر چکا ہوتا ہے۔
 * میزوں کی فہرست lib/backupTables سے آتی ہے (خودکار بیک اپ کے ساتھ ایک ہی جگہ)۔
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isMadrasaOwner } from "@/lib/approval";
import { todayInKarachi } from "@/lib/attendance";
import { ADMIN_TABLES, OWN_TABLES } from "@/lib/backupTables";

export const dynamic = "force-dynamic";

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
  const owner = await isMadrasaOwner(supabase);
  // حصہ 4 کی درستگی — بیک اپ صرف مالک ڈاؤن لوڈ کر سکتا ہے (سپر ایڈمن ہونا ضروری نہیں)
  if (!owner) {
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
  if (owner) {
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
