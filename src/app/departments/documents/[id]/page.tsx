/**
 * مرحلہ 28 — دستاویز کی تفصیل + ترمیم (سرور)
 * میز ابھی نہ بنی ہو (migration 021 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import DocumentForm from "@/app/departments/documents/DocumentForm";
import ArchiveButton from "@/app/departments/documents/ArchiveButton";
import { updateDocument } from "@/app/departments/documents/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  isExpired,
  type MadrasaDocument,
} from "@/lib/documents";
import { todayInKarachi } from "@/lib/attendance";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ur-PK");
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/documents" />
            <h2>دستاویز کی تفصیل</h2>
          </div>
          <p className="empty-state">
            دستاویزات کی میز ابھی نہیں بنی — پہلے مرحلہ 28 کی SQL چلائیں۔
          </p>
        </div>
      </div>
    );
  }

  const doc = data as MadrasaDocument | null;
  if (!doc) {
    notFound();
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/documents" />
          <h2>دستاویز کی تفصیل</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>عنوان</span>
            <strong>{doc.title}</strong>
          </div>
          <div className="row">
            <span>قسم</span>
            <strong>{DOCUMENT_TYPE_LABELS[doc.doc_type]}</strong>
          </div>
          {doc.reference_no ? (
            <div className="row">
              <span>حوالہ نمبر</span>
              <strong>{doc.reference_no}</strong>
            </div>
          ) : null}
          {doc.issued_by ? (
            <div className="row">
              <span>جاری کرنے والا ادارہ</span>
              <strong>{doc.issued_by}</strong>
            </div>
          ) : null}
          <div className="row">
            <span>جاری ہونے کی تاریخ</span>
            <strong>{formatDate(doc.issue_date)}</strong>
          </div>
          <div className="row">
            <span>میعاد ختم ہونے کی تاریخ</span>
            <strong>
              {formatDate(doc.expiry_date)}
              {isExpired(doc, todayInKarachi()) ? " — میعاد ختم" : ""}
            </strong>
          </div>
          <div className="row">
            <span>حالت</span>
            <strong>{DOCUMENT_STATUS_LABELS[doc.status]}</strong>
          </div>
          {doc.note ? (
            <div className="row">
              <span>نوٹ</span>
              <strong>{doc.note}</strong>
            </div>
          ) : null}
        </div>

        {doc.status === "active" ? (
          <div className="form-actions">
            <ArchiveButton id={doc.id} />
          </div>
        ) : null}

        <DocumentForm
          document={doc}
          action={updateDocument}
          detailId={`/departments/documents/${doc.id}`}
        />
      </div>
    </div>
  );
}
