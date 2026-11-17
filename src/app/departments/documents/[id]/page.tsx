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
  isExpired,
  type MadrasaDocument,
} from "@/lib/documents";
import {
  formatFileSize,
  type DocumentFile,
} from "@/lib/documentFiles";
import { todayInKarachi } from "@/lib/attendance";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

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
  const langP = getMyLanguage();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();

  const lang = await langP;

  if ((error as { code?: string } | null)?.code === "42P01") {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/documents" />
            <h2>{t(lang, "doc.detail_title")}</h2>
          </div>
          <p className="empty-state">{t(lang, "docs.table_missing")}</p>
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
          <h2>{t(lang, "doc.detail_title")}</h2>
        </div>

        <div className="detail-rows">
          <div className="row">
            <span>{t(lang, "notices.col_title")}</span>
            <strong>{doc.title}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.type")}</span>
            <strong>{t(lang, `doc.type.${doc.doc_type}`)}</strong>
          </div>
          {doc.reference_no ? (
            <div className="row">
              <span>{t(lang, "doc.form.ref_no")}</span>
              <strong>{doc.reference_no}</strong>
            </div>
          ) : null}
          {doc.issued_by ? (
            <div className="row">
              <span>{t(lang, "doc.form.issued_by")}</span>
              <strong>{doc.issued_by}</strong>
            </div>
          ) : null}
          <div className="row">
            <span>{t(lang, "doc.form.issue_date")}</span>
            <strong>{formatDate(doc.issue_date)}</strong>
          </div>
          <div className="row">
            <span>{t(lang, "doc.form.expiry_date")}</span>
            <strong>
              {formatDate(doc.expiry_date)}
              {isExpired(doc, todayInKarachi())
                ? ` — ${t(lang, "doc.status.expired")}`
                : ""}
            </strong>
          </div>
          <div className="row">
            <span>{t(lang, "col.status")}</span>
            <strong>{t(lang, `doc.status.${doc.status}`)}</strong>
          </div>
          {doc.note ? (
            <div className="row">
              <span>{t(lang, "doc.form.note")}</span>
              <strong>{doc.note}</strong>
            </div>
          ) : null}
        </div>

        {doc.status === "active" ? (
          <div className="form-actions">
            <ArchiveButton id={doc.id} lang={lang} />
          </div>
        ) : null}

        <h3 className="form-section-title">{t(lang, "doc.files.title")}</h3>
        {filesTableMissing ? (
          <p className="empty-state">{t(lang, "doc.files.table_missing")}</p>
        ) : (
          <>
            <DocumentFileUploadForm documentId={doc.id} lang={lang} />
            {files.length === 0 ? (
              <p className="empty-state">{t(lang, "doc.files.empty")}</p>
            ) : (
              <div className="tbl-wrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>{t(lang, "col.name")}</th>
                      <th>{t(lang, "col.type")}</th>
                      <th>{t(lang, "doc.files.col_size")}</th>
                      <th>{t(lang, "col.date")}</th>
                      <th>{t(lang, "col.status")}</th>
                      <th>{t(lang, "col.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.id}>
                        <td>{f.file_name}</td>
                        <td>
                          {f.file_type === "application/pdf"
                            ? "PDF"
                            : f.file_type.startsWith("image/")
                              ? t(lang, "doc.files.type_image")
                              : t(lang, "doc.files.type_file")}
                        </td>
                        <td>{formatFileSize(f.file_size)}</td>
                        <td>{formatDate(f.created_at)}</td>
                        <td>
                          <span
                            className={`badge${f.status === "voided" ? " badge-withdrawn" : ""}`}
                          >
                            {t(lang, `doc.files.status.${f.status}`)}
                          </span>
                        </td>
                        <td>
                          {f.status === "active" ? (
                            <>
                              {f.url ? (
                                <Link href={f.url} target="_blank" rel="noreferrer">
                                  {t(lang, "doc.files.download")}
                                </Link>
                              ) : (
                                "—"
                              )}{" "}
                              <VoidDocumentFileButton
                                id={f.id}
                                documentId={doc.id}
                                lang={lang}
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
          lang={lang}
        />
      </div>
    </div>
  );
}
