/**
 * مرحلہ 30 — بیک اپ (سرور صفحہ)
 * ہر میز کی تعداد دکھاتا ہے + "بیک اپ ڈاؤن لوڈ کریں" کا بٹن۔
 * مرحلہ 42 — بیک اپ واپس لانے کا حصہ (RestoreBackupForm) بھی یہیں ہے۔
 * حصہ 4 — یہ صفحہ صرف مدرسے کے مالک کے لیے ہے (عملہ بیک اپ نہیں دیکھ سکتا)۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import RestoreBackupForm from "@/app/departments/backup/RestoreBackupForm";
import { createClient } from "@/lib/supabase/server";
import { isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

const TABLE_IDS = [
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ur-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BackupPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();

  // حصہ 4 کی درستگی — بیک اپ صرف مالک کے لیے (سپر ایڈمن ہونا ضروری نہیں)
  const owner = await isMadrasaOwner(supabase);
  if (!owner) {
    notFound();
  }

  // مرحلہ 80 — آخری بیک اپ کی تاریخ (میز نہ بنی ہو تو خالی)
  let lastBackupAt: string | null = null;
  const { data: lastBackup } = await supabase
    .from("backup_log")
    .select("downloaded_at")
    .order("downloaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastBackup?.downloaded_at) {
    lastBackupAt = lastBackup.downloaded_at as string;
  }

  // مرحلہ 83 — خودکار بیک اپوں کی فہرست (نجی بکٹ؛ صرف اپنا مدرسہ)
  // بکٹ/پالیسی نہ بنی ہو تو فہرست خالی رہتی ہے — صفحہ نہیں ٹوٹتا
  const mine = await getMyMadrasa(supabase);
  type AutoBackup = { name: string; url: string; sizeKb: string };
  const autoBackups: AutoBackup[] = [];
  if (mine) {
    const { data: autoFiles } = await supabase.storage
      .from("backups")
      .list(mine.madrasaId, {
        limit: 30,
        sortBy: { column: "name", order: "desc" },
      });
    for (const f of autoFiles ?? []) {
      const { data: signed } = await supabase.storage
        .from("backups")
        .createSignedUrl(`${mine.madrasaId}/${f.name}`, 3600);
      if (!signed?.signedUrl) continue;
      const size = (f.metadata as { size?: number } | null)?.size;
      autoBackups.push({
        name: f.name,
        url: signed.signedUrl,
        sizeKb:
          typeof size === "number" && size > 0
            ? `${Math.max(1, Math.round(size / 1024))} KB`
            : "—",
      });
    }
  }

  // مرحلہ 84 — "آخری بیک اپ" میں خودکار بیک اپ بھی شمار ہوتا ہے
  const latestAutoAt =
    autoBackups.length > 0
      ? `${autoBackups[0].name.replace("auto-", "").replace(".json", "")}T00:00:00Z`
      : null;
  const lastAnyAt =
    [lastBackupAt, latestAutoAt]
      .filter((d): d is string => d !== null)
      .sort()
      .pop() ?? null;
  const lastAnyAuto = lastAnyAt !== null && lastAnyAt === latestAutoAt;

  const counts: { table: string; count: number | null }[] = [];
  for (const table of TABLE_IDS) {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true });
    counts.push({
      table,
      count: error ? null : (count ?? 0),
    });
  }

  const lang = await langP;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>{t(lang, "backup.title")}</h2>
        </div>

        <p className="sub">{t(lang, "backup.sub")}</p>

        <div className="form-actions">
          <a className="btn-primary" href="/api/backup">
            {t(lang, "backup.download")}
          </a>
        </div>

        {lastAnyAt ? (
          <p className="sub">
            {t(lang, "backup.last_backup", { date: formatDate(lastAnyAt) })}
            {lastAnyAuto ? t(lang, "backup.last_auto") : ""}
            {Date.now() - new Date(lastAnyAt).getTime() >
            30 * 24 * 60 * 60 * 1000
              ? t(lang, "backup.stale")
              : ""}
          </p>
        ) : (
          <p className="sub">{t(lang, "backup.no_last")}</p>
        )}

        <h3 className="form-section-title">{t(lang, "backup.auto_title")}</h3>
        {autoBackups.length === 0 ? (
          <p className="sub">{t(lang, "backup.auto_empty")}</p>
        ) : (
          <div className="detail-rows">
            {autoBackups.map((b) => (
              <div className="row" key={b.name}>
                <span>
                  {formatDate(
                    b.name.replace("auto-", "").replace(".json", ""),
                  )}{" "}
                  — {b.sizeKb}
                </span>
                <a
                  className="btn-ghost"
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t(lang, "backup.download_one")}
                </a>
              </div>
            ))}
          </div>
        )}

        <h3 className="form-section-title">{t(lang, "backup.counts_title")}</h3>
        <div className="detail-rows">
          {counts.map((c) => (
            <div className="row" key={c.table}>
              <span>{t(lang, `backup.tbl.${c.table}`)}</span>
              <strong>{c.count === null ? t(lang, "backup.table_missing") : c.count}</strong>
            </div>
          ))}
        </div>

        <h3 className="form-section-title">{t(lang, "backup.restore_title")}</h3>
        <RestoreBackupForm lang={lang} />
      </div>
    </div>
  );
}
