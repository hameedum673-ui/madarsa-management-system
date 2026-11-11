/**
 * مرحلہ 7 — اساتذہ کی حاضری کا Server Action (محفوظ کرنا)
 * ایک دن کی حاضری دوبارہ لگانے سے پرانی درست ہوتی ہے (upsert)، نقل نہیں بنتی۔
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import {
  ATTENDANCE_STATUSES,
  isValidPastOrTodayDate,
  type AttendanceStatus,
} from "@/lib/attendance";
import { getMyMadrasa,
  type SectionId,
} from "@/lib/students";

type SaveResult =
  | {
      ok: true;
      summary: { present: number; absent: number; leave: number; late: number };
    }
  | { error: string };

export async function saveTeacherAttendance(
  formData: FormData,
): Promise<SaveResult> {
  const date = String(formData.get("date") ?? "");
  if (!isValidPastOrTodayDate(date)) {
    return { error: "تاریخ درست نہیں ہے۔" };
  }

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };

  // فارم سے status_<استاد-id> والے کھیت نکالیں
  const entries: { teacherId: string; status: AttendanceStatus }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("status_")) continue;
    const teacherId = key.slice("status_".length);
    const status = String(value);
    if (!ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) continue;
    if (!/^[0-9a-f-]{36}$/i.test(teacherId)) continue;
    entries.push({ teacherId, status: status as AttendanceStatus });
  }
  if (entries.length === 0) {
    return { error: "کسی استاد کی حاضری نہیں لگائی گئی۔" };
  }

  // صرف اپنے مدرسے کے فعال اساتذہ کی حاضری لگ سکتی ہے
  const { data: owned } = await supabase
    .from("teachers")
    .select("id, section")
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active");
  // مرحلہ 54 — صرف اجازت والے شعبے کی حاضری لگ سکتی ہے
  const allowedSections = await getMyAllowedSections(supabase);
  const ownedIds = new Set(
    ((owned ?? []) as { id: string; section: string }[])
      .filter((s) =>
        allowedSections.has((s.section ?? "banat") as SectionId),
      )
      .map((s) => s.id as string),
  );

  const rows = entries
    .filter((e) => ownedIds.has(e.teacherId))
    .map((e) => ({
      madrasa_id: mine.madrasaId,
      teacher_id: e.teacherId,
      date,
      status: e.status,
      marked_by: mine.userId,
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) {
    return { error: "اساتذہ کی تصدیق نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  const { error } = await supabase
    .from("teacher_attendance")
    .upsert(rows, { onConflict: "madrasa_id,teacher_id,date" });
  if (error) {
    return { error: "حاضری محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  const summary = { present: 0, absent: 0, leave: 0, late: 0 };
  for (const r of rows) summary[r.status] += 1;

  // آڈٹ لاگ میں ایک اندراج — پورے دن کی حاضری کے لیے
  try {
    await supabase.from("audit_log").insert({
      madrasa_id: mine.madrasaId,
      user_id: mine.userId,
      action: "teacher_attendance_marked",
      details: {
        date,
        present: String(summary.present),
        absent: String(summary.absent),
        leave: String(summary.leave),
        late: String(summary.late),
        total: String(rows.length),
      },
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }

  revalidatePath("/departments/att-teachers");
  return { ok: true, summary };
}
