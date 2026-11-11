/**
 * مرحلہ 41 — دستاویز کے ساتھ لگی فائلوں کی اقسام
 * فائل Storage بکٹ 'documents' میں رہتی ہے؛ یہ میز صرف اس کا ریکارڈ ہے۔
 * فائل کبھی حذف نہیں ہوتی — غلط فائل صرف چھپائی (voided) جاتی ہے۔
 */

export type DocumentFileStatus = "active" | "voided";

export const DOCUMENT_FILE_STATUS_LABELS: Record<DocumentFileStatus, string> =
  {
    active: "فعال",
    voided: "منسوخ",
  };

export interface DocumentFile {
  id: string;
  madrasa_id: string;
  document_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: DocumentFileStatus;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

/** فائل کا سائز اردو میں — مثلاً "2.4 MB" یا "320 KB" */
export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("ur-PK", { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString("ur-PK")} KB`;
}

/** فائل کی قسم کا اردو نام */
export function fileTypeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "تصویر";
  return "فائل";
}
