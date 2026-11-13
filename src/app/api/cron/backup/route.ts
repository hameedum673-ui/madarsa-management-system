/**
 * مرحلہ 83 — خودکار بیک اپ (Vercel cron — روزانہ صبح 2 بجے UTC)
 * صرف Vercel کرون بلا سکتا ہے: Authorization: Bearer <CRON_SECRET>
 * (Vercel خود یہ ہیڈر بھیجتا ہے)۔ بغیر درست ہیڈر کے 401۔
 * ڈیٹا service-role چابی سے پڑھا جاتا ہے (RLS سے بالاتر) — یہ چابی
 * صرف Vercel کے env میں ہوتی ہے، کوڈ میں کبھی نہیں۔
 * صرف منظور شدہ مالک والے مدرسے — مہمان (ڈیمو) اور خالی یتیم مدرسے نہیں۔
 * ہر مدرسے کی ناکامی دوسرے کو نہیں روکتی۔
 * نوٹ: Vercel میں env لگنے کے بعد دوبارہ ڈیپلائی ضروری ہے۔
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildBackupPayload } from "@/lib/autoBackup";
import { todayInKarachi } from "@/lib/attendance";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BUCKET = "backups";
const RETENTION_DAYS = 30;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set." },
      { status: 500 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Service key is not set." },
      { status: 500 },
    );
  }
  const admin = createClient(url, serviceKey);

  const { data: owners, error: ownersError } = await admin
    .from("approved_users")
    .select("assigned_madrasa_id")
    .eq("member_type", "owner")
    .eq("status", "approved");
  if (ownersError) {
    return NextResponse.json(
      { error: "Could not list madrasas." },
      { status: 500 },
    );
  }
  const madrasaIds = [
    ...new Set(
      ((owners ?? []) as { assigned_madrasa_id?: string }[])
        .map((o) => o.assigned_madrasa_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const results: { madrasa_id: string; ok: boolean; error?: string }[] = [];
  for (const madrasaId of madrasaIds) {
    try {
      const payload = await buildBackupPayload(admin, madrasaId);
      const path = `${madrasaId}/auto-${todayInKarachi()}.json`;
      const { error: uploadError } = await admin.storage
        .from(BUCKET)
        .upload(path, JSON.stringify(payload, null, 2), {
          contentType: "application/json; charset=utf-8",
          upsert: true,
        });
      if (uploadError) throw new Error(uploadError.message);

      // 30 دن سے پرانی خودکار فائلیں مٹائیں (ناکام ہو تو بیک اپ پھر بھی ٹھیک ہے)
      try {
        const { data: files } = await admin.storage
          .from(BUCKET)
          .list(madrasaId, { limit: 100 });
        const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
        const old = (files ?? [])
          .filter((f) => {
            const m = /^auto-(\d{4})-(\d{2})-(\d{2})\.json$/.exec(f.name);
            if (!m) return false;
            return (
              new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`).getTime() < cutoff
            );
          })
          .map((f) => `${madrasaId}/${f.name}`);
        if (old.length > 0) {
          await admin.storage.from(BUCKET).remove(old);
        }
      } catch {
        // صفائی ناکام ہو تو بیک اپ پھر بھی ٹھیک ہے
      }

      results.push({ madrasa_id: madrasaId, ok: true });
    } catch (e) {
      results.push({
        madrasa_id: madrasaId,
        ok: false,
        error: e instanceof Error ? e.message : "نامعلوم خرابی",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    backed_up: results.filter((r) => r.ok).length,
    total: madrasaIds.length,
    results,
  });
}
