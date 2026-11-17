/**
 * مرحلہ 42 — بیک اپ واپس لانے (restore) کا Server Action
 * اصول: صرف اسی سسٹم کی اور اسی مدرسے کی بیک اپ فائل؛ جو ریکارڈ پہلے
 * سے موجود ہے وہ کبھی اوور رائٹ نہیں ہوتا؛ بند مہینے کا مالی ریکارڈ
 * نہیں لگایا جاتا؛ صارفین / اجازتیں / آڈٹ لاگ / پروفائل / دستاویز کی
 * فائلیں بحال نہیں ہوتیں۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isMadrasaOwner } from "@/lib/approval";
import { isModuleAllowedForMe } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import { isMonthClosed, monthOfDate } from "@/lib/monthClosing";
import {
  MAX_BACKUP_FILE_SIZE,
  RESTORE_TABLES,
  type RestoreTableReport,
} from "@/lib/restore";
import { isLang, t, type Lang } from "@/i18n/dictionary";

export type RestoreResult =
  | { ok: true; report: RestoreTableReport[] }
  | { error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** مرحلہ 128 — فارم کے چھپے ہوئے خانے سے زبان (نہ ملی تو اردو) */
function formLang(formData: FormData): Lang {
  const v =
    typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

export async function restoreBackup(
  formData: FormData,
): Promise<RestoreResult> {
  const lang = formLang(formData);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: t(lang, "backup.err.choose_first") };
  }
  if (file.size > MAX_BACKUP_FILE_SIZE) {
    return { error: t(lang, "backup.err.too_big") };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return { error: t(lang, "backup.err.not_json") };
  }

  if (!isRecord(parsed) || parsed.app !== "madrasa-management-system") {
    return { error: t(lang, "backup.err.not_system") };
  }
  if (!isRecord(parsed.tables)) {
    return { error: t(lang, "backup.err.no_data") };
  }
  const tables = parsed.tables as Record<string, unknown>;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: t(lang, "common.not_logged_in") };
  // حصہ 4 کی درستگی — بیک اپ واپس لانا صرف مالک کا کام ہے (سپر ایڈمن ہونا ضروری نہیں)
  if (!(await isMadrasaOwner(supabase))) {
    return { error: t(lang, "backup.err.owner_only") };
  }
  if (!(await isModuleAllowedForMe(supabase, "backup"))) {
    return { error: t(lang, "common.not_allowed") };
  }

  // فائل کسی اور مدرسے کی ہو تو پورا کام رک جاتا ہے
  if (
    typeof parsed.madrasa_id === "string" &&
    parsed.madrasa_id !== mine.madrasaId
  ) {
    return { error: t(lang, "backup.err.other_madrasa") };
  }

  const closedCache = new Map<string, boolean>();
  async function monthClosed(month: string): Promise<boolean> {
    const cached = closedCache.get(month);
    if (cached !== undefined) return cached;
    const value = await isMonthClosed(supabase, mine!.madrasaId, month);
    closedCache.set(month, value);
    return value;
  }

  const report: RestoreTableReport[] = [];

  for (const entry of RESTORE_TABLES) {
    const raw = tables[entry.table];
    if (!Array.isArray(raw)) {
      // پرانی بیک اپ فائل میں یہ میز نہ ہو تو چھوڑ دیں
      continue;
    }
    const rows = raw.filter(isRecord);
    const rowReport: RestoreTableReport = {
      table: entry.table,
      label: entry.label,
      total: rows.length,
      added: 0,
      skipped: 0,
      closed: 0,
      failed: 0,
    };

    const toInsert: Record<string, unknown>[] = [];
    for (const row of rows) {
      if (typeof row.id !== "string" || !row.id) {
        rowReport.failed += 1;
        continue;
      }
      // کسی اور مدرسے کا ریکارڈ ہو تو اسے چھوڑ دیں
      if (
        typeof row.madrasa_id === "string" &&
        row.madrasa_id !== mine.madrasaId
      ) {
        rowReport.failed += 1;
        continue;
      }
      // بند مہینے کا مالی ریکارڈ نہیں لگایا جاتا
      if (entry.monthField) {
        const value = row[entry.monthField];
        if (typeof value === "string" && value) {
          const month = entry.monthFieldIsMonth
            ? value
            : monthOfDate(value);
          if (month && (await monthClosed(month))) {
            rowReport.closed += 1;
            continue;
          }
        }
      }
      toInsert.push({ ...row, madrasa_id: mine.madrasaId });
    }

    // 100 ریکارڈ کے حصوں میں لگائیں — ایک حصہ ناکام ہو تو باقی چلتے ہیں
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      try {
        const { data, error } = await supabase
          .from(entry.table)
          .upsert(chunk, { onConflict: "id", ignoreDuplicates: true })
          .select("id");
        if (error) {
          rowReport.failed += chunk.length;
          continue;
        }
        const added = (data ?? []).length;
        rowReport.added += added;
        rowReport.skipped += chunk.length - added;
      } catch {
        rowReport.failed += chunk.length;
      }
    }

    report.push(rowReport);
  }

  // آڈٹ لاگ میں اندراج — ناکام ہو تو بحال شدہ ڈیٹا نہیں رکتا
  try {
    const totalAdded = report.reduce((n, r) => n + r.added, 0);
    const totalSkipped = report.reduce((n, r) => n + r.skipped, 0);
    await supabase.from("audit_log").insert({
      madrasa_id: mine.madrasaId,
      user_id: mine.userId,
      action: "backup_restored",
      details: {
        added: String(totalAdded),
        skipped: String(totalSkipped),
      },
    });
  } catch {
    /* آڈٹ ناکام ہو تو بحال شدہ ڈیٹا نہیں رکتا */
  }

  revalidatePath("/departments/backup");
  revalidatePath("/");
  return { ok: true, report };
}
