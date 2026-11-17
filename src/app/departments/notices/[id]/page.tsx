/**
 * مرحلہ 27 — اطلاع کی تفصیل + ترمیم (سرور)
 * میز ابھی نہ بنی ہو (migration 020 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import NoticeForm from "@/app/departments/notices/NoticeForm";
import ArchiveButton from "@/app/departments/notices/ArchiveButton";
import { updateNotice } from "@/app/departments/notices/actions";
import { createClient } from "@/lib/supabase/server";
import { type Notice } from "@/lib/notices";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("id", id)
    .single();

  const lang = await langP;

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/notices" />
            <h2>{t(lang, "notice.detail_title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "notices.table_missing")}</p>
        </div>
      </div>
    );
  }

  const notice = data as Notice | null;
  if (!notice) {
    notFound();
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/notices" />
          <h2>{t(lang, "notice.detail_title")}</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "notices.col_title")}</span>
            <strong>{notice.title}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.type")}</span>
            <strong>{t(lang, `notice.kind.${notice.kind}`)}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.date")}</span>
            <strong>{formatDate(notice.notice_date)}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <strong>{t(lang, `library.status.${notice.status}`)}</strong>
          </div>
          {notice.body ? (
            <div className="row">
              <span>{t(lang, "notice.form.body")}</span>
              <strong>{notice.body}</strong>
            </div>
          ) : null}
        </div>

        {notice.status === "active" ? (
          <div className="form-actions">
            <ArchiveButton id={notice.id} lang={lang} />
          </div>
        ) : null}

        <NoticeForm
          notice={notice}
          action={updateNotice}
          detailId={`/departments/notices/${notice.id}`}
          lang={lang}
        />
      </div>
    </div>
  );
}
