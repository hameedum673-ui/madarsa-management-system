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
import {
  NOTICE_KIND_LABELS,
  NOTICE_STATUS_LABELS,
  type Notice,
} from "@/lib/notices";

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
  const { data, error } = await supabase
    .from("notices")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/notices" />
            <h2>اطلاع کی تفصیل</h2>
          </div>
          <p className="empty-state">
            اطلاعات کی میز ابھی نہیں بنی — پہلے مرحلہ 27 کی SQL چلائیں۔
          </p>
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
          <h2>اطلاع کی تفصیل</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>عنوان</span>
            <strong>{notice.title}</strong>
          </div>
          <div className="row">
            <span>قسم</span>
            <strong>{NOTICE_KIND_LABELS[notice.kind]}</strong>
          </div>
          <div className="row">
            <span>تاریخ</span>
            <strong>{formatDate(notice.notice_date)}</strong>
          </div>
          <div className="row">
            <span>حالت</span>
            <strong>{NOTICE_STATUS_LABELS[notice.status]}</strong>
          </div>
          {notice.body ? (
            <div className="row">
              <span>تفصیل</span>
              <strong>{notice.body}</strong>
            </div>
          ) : null}
        </div>

        {notice.status === "active" ? (
          <div className="form-actions">
            <ArchiveButton id={notice.id} />
          </div>
        ) : null}

        <NoticeForm
          notice={notice}
          action={updateNotice}
          detailId={`/departments/notices/${notice.id}`}
        />
      </div>
    </div>
  );
}
