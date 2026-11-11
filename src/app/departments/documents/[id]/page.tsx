/**
 * مرحلہ 28 — دستاویز کی تفصیل + ترمیم (سرور)
 * میز ابھی نہ بنی ہو (migration 021 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import DocumentForm from "@/app/departments/documents/DocumentForm";
import ArchiveButton from "@/app/departments/documents/ArchiveButton";
import DocumentFileUploadForm from "@/app/departments/documents/[id]/DocumentFileUploadForm";
import VoidDocumentFileButton from "@/app/departments/documents/[id]/VoidDocumentFileButton";
import { updateDocument } from "@/app/departments/documents/actions";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  isExpired,
  type MadrasaDocument,
} from "@/lib/documents";
import {
  DOCUMENT_FILE_STATUS_LABELS,
  fileTypeLabel,
  formatFileSize,
  type DocumentFile,
} from "@/lib/documentFiles";
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

  // مرحلہ 41 — لگی ہوئی فائلیں + ڈاؤن لوڈ کے لنک (1 گھنٹے کے لیے)
  // (میز نہ ہو تو صرف یہ حصہ پیغام دکھاتا ہے، باقی صفحہ ویسے ہی کھلتا ہے)
  let filesTableMissing = false;
  let files: (DocumentFile & { url: string | null })[] = [];
  const { data: filesData, error: filesError } = await supabase
    .from("document_files")
    .select("*")
    .eq("document_id", id)
    .order("created_at", { ascending: false });
  filesTableMissing =
    (filesError as { code?: string } | null)?.code === "42P01";
  const fileRows = (filesData ?? []) as DocumentFile[];
  files = await Promise.all(
    fileRows.map(async (f) => {
      if (f.status !== "active") return { ...f, url: null };
      const { data: urlData } = await supabase.storage
        .from("documents")
        .createSignedUrl(f.file_path, 3600);
      return { ...f, url: urlData?.signedUrl ?? null };
    }),
  );

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

        <h3 className="form-section-title">منسلک فائلیں</h3>
        {filesTableMissing ? (
          <p className="empty-state">
            فائلوں کی میز ابھی نہیں بنی — پہلے مرحلہ 41 کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <DocumentFileUploadForm documentId={doc.id} />
            {files.length === 0 ? (
              <p className="empty-state">
                ابھی کوئی فائل نہیں لگی — اوپر والے فارم سے پہلی فائل لگائیں۔
              </p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>نام</th>
                      <th>قسم</th>
                      <th>سائز</th>
                      <th>تاریخ</th>
                      <th>حالت</th>
                      <th>کارروائی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td>{f.file_name}</td>
                        <td>{fileTypeLabel(f.file_type)}</td>
                        <td>{formatFileSize(f.file_size)}</td>
                        <td>{formatDate(f.created_at)}</td>
                        <td>
                          <span
                            className={`badge${f.status === "voided" ? " badge-withdrawn" : ""}`}
                          >
                            {DOCUMENT_FILE_STATUS_LABELS[f.status]}
                          </span>
                        </td>
                        <td>
                          {f.status === "active" ? (
                            <>
                              {f.url ? (
                                <Link href={f.url} target="_blank" rel="noreferrer">
                                  ڈاؤن لوڈ کریں
                                </Link>
                              ) : (
                                "—"
                              )}{" "}
                              <VoidDocumentFileButton
                                id={f.id}
                                documentId={doc.id}
                              />
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        <DocumentForm
          document={doc}
          action={updateDocument}
          detailId={`/departments/documents/${doc.id}`}
        />
      </div>
    </div>
  );
}
