/**
 * مرحلہ 28 — دستاویزات کے Server Actions (اضافہ / تبدیلی / محفوظ)
 * ہر کام سرور پر جانچا جاتا ہے؛ RLS پالیسیاں بھی ہر لکھنے پر لاگو ہوتی ہیں۔
 * دستاویز کبھی حذف نہیں ہوتی — پرانی دستاویز محفوظ (archive) کی جاتی ہے۔
 */
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isModuleAllowedForMe, MODULE_DENIED_ERROR } from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import {
  DOCUMENT_TYPES,
  type DocumentStatus,
  type DocumentType,
} from "@/lib/documents";

type ActionResult = { ok: true } | { error: string };

function clean(value: FormDataEntryValue | null, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validDate(value: string): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

interface DocumentFields {
  title: string;
  docType: DocumentType;
  referenceNo: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
  note: string;
}

/** فارم کی جانچ — غلط ہو تو اردو غلطی، درست ہو تو صاف شدہ کھیت */
function validateFields(
  formData: FormData,
): { fields: DocumentFields } | { error: string } {
  const title = clean(formData.get("title"), 200);
  const docType = clean(formData.get("doc_type"), 20);
  const referenceNo = clean(formData.get("reference_no"), 100);
  const issuedBy = clean(formData.get("issued_by"), 200);
  const issueDate = clean(formData.get("issue_date"), 10);
  const expiryDate = clean(formData.get("expiry_date"), 10);
  const note = clean(formData.get("note"), 1000);

  if (!title) return { error: "عنوان ضروری ہے۔" };
  if (!DOCUMENT_TYPES.includes(docType as DocumentType))
    return { error: "قسم درست منتخب کریں۔" };
  if (issueDate && !validDate(issueDate))
    return { error: "جاری ہونے کی تاریخ درست نہیں ہے۔" };
  if (expiryDate && !validDate(expiryDate))
    return { error: "میعاد ختم ہونے کی تاریخ درست نہیں ہے۔" };

  return {
    fields: {
      title,
      docType: docType as DocumentType,
      referenceNo,
      issuedBy,
      issueDate,
      expiryDate,
      note,
    },
  };
}

/** آڈٹ لاگ میں اندراج — ناکام ہو تو اصل کام نہیں رکتا */
async function writeAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  madrasaId: string,
  userId: string,
  action: string,
  details: Record<string, string>,
) {
  try {
    await supabase.from("audit_log").insert({
      madrasa_id: madrasaId,
      user_id: userId,
      action,
      details,
    });
  } catch {
    /* آڈٹ ناکام ہو تو اصل کام نہیں رکتا */
  }
}

/** نئی دستاویز شامل کریں */
export async function addDocument(formData: FormData): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "documents"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  const { data, error } = await supabase
    .from("documents")
    .insert({
      madrasa_id: mine.madrasaId,
      title: f.title,
      doc_type: f.docType,
      reference_no: f.referenceNo || null,
      issued_by: f.issuedBy || null,
      issue_date: f.issueDate || null,
      expiry_date: f.expiryDate || null,
      note: f.note || null,
      status: "active",
      created_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "document_created", {
    document_id: data.id as string,
    title: f.title,
  });

  revalidatePath("/departments/documents");
  revalidatePath("/");
  return { ok: true };
}

/** دستاویز تبدیل کریں — مدرسہ کبھی نہیں بدلتا */
export async function updateDocument(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const checked = validateFields(formData);
  if ("error" in checked) return { error: checked.error };
  const f = checked.fields;

  const status = clean(formData.get("status"), 20);
  if (status !== "active" && status !== "expired" && status !== "archived")
    return { error: "حالت درست منتخب کریں (فعال، میعاد ختم یا محفوظ شدہ)۔" };

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "documents"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // RLS خود یقین دلاتی ہے کہ یہ دستاویز اسی مدرسے کی ہے
  const { data, error } = await supabase
    .from("documents")
    .update({
      title: f.title,
      doc_type: f.docType,
      reference_no: f.referenceNo || null,
      issued_by: f.issuedBy || null,
      issue_date: f.issueDate || null,
      expiry_date: f.expiryDate || null,
      note: f.note || null,
      status: status as DocumentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .select("id")
    .single();

  if (error || !data) {
    return { error: "تبدیلی محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "document_updated", {
    document_id: data.id as string,
    title: f.title,
  });

  revalidatePath("/departments/documents");
  revalidatePath(`/departments/documents/${id}`);
  revalidatePath("/");
  return { ok: true };
}

/**
 * مرحلہ 41 — دستاویز کے ساتھ فائل لگائیں (تصویر یا PDF، زیادہ سے زیادہ 5 MB)
 * فائل نجی Storage بکٹ 'documents' میں جاتی ہے، راستہ اپنے مدرسے کی id
 * سے شروع ہوتا ہے؛ ریکارڈ document_files میز میں بنتا ہے۔
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

export async function uploadDocumentFile(
  formData: FormData,
): Promise<ActionResult> {
  const documentId = clean(formData.get("document_id"), 100);
  const file = formData.get("file");

  if (!documentId) return { error: "دستاویز معلوم نہیں ہوئی۔" };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "پہلے فائل چنیں۔" };
  }
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { error: "صرف تصویر (JPG/PNG) یا PDF فائل لگائی جا سکتی ہے۔" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "فائل 5 MB سے بڑی نہیں ہو سکتی۔" };
  }

  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "documents"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  // دستاویز اپنے مدرسے کی ہونی چاہیے
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title")
    .eq("id", documentId)
    .eq("madrasa_id", mine.madrasaId)
    .single();
  if (!doc) {
    return { error: "دستاویز نہیں ملی — پہلے دستاویزات کی فہرست میں دیکھیں۔" };
  }

  const safeName =
    file.name.replace(/[^\w.\-() ]+/g, "_").trim().slice(0, 100) || "file";
  const filePath = `${mine.madrasaId}/${documentId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    return { error: "فائل اپلوڈ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  const { data, error } = await supabase
    .from("document_files")
    .insert({
      madrasa_id: mine.madrasaId,
      document_id: documentId,
      file_name: file.name.slice(0, 200),
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      status: "active",
      uploaded_by: mine.userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    // ریکارڈ نہ بنے تو اپلوڈ کی ہوئی فائل بھی ہٹا دیں تاکہ کچرا نہ رہے
    await supabase.storage.from("documents").remove([filePath]);
    return { error: "فائل محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "document_file_uploaded",
    {
      document_id: documentId,
      file_name: file.name.slice(0, 200),
    },
  );

  revalidatePath("/departments/documents");
  revalidatePath(`/departments/documents/${documentId}`);
  return { ok: true };
}

/**
 * مرحلہ 41 — لگی ہوئی فائل چھپائیں (منسوخ کریں)
 * فائل Storage سے حذف نہیں ہوتی — صرف فہرست سے ہٹتی ہے، ریکارڈ رہتا ہے۔
 */
export async function voidDocumentFile(
  id: string,
  documentId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "documents"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  const { data, error } = await supabase
    .from("document_files")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("document_id", documentId)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, file_name")
    .single();

  if (error || !data) {
    return { error: "چھپایا نہیں جا سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(
    supabase,
    mine.madrasaId,
    mine.userId,
    "document_file_voided",
    {
      document_id: documentId,
      file_name: data.file_name as string,
    },
  );

  revalidatePath("/departments/documents");
  revalidatePath(`/departments/documents/${documentId}`);
  return { ok: true };
}

/** دستاویز محفوظ کریں (archive) — حذف نہیں ہوتی، ریکارڈ رہتا ہے */
export async function archiveDocument(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const mine = await getMyMadrasa(supabase);
  if (!mine) return { error: "لاگ اِن نہیں ہے۔ دوبارہ لاگ اِن کریں۔" };
  if (!(await isModuleAllowedForMe(supabase, "documents"))) {
    return { error: MODULE_DENIED_ERROR };
  }

  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "archived" as DocumentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .select("id, title")
    .single();

  if (error || !data) {
    return { error: "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔" };
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "document_archived", {
    document_id: data.id as string,
    title: (data as { title: string }).title,
  });

  revalidatePath("/departments/documents");
  revalidatePath(`/departments/documents/${id}`);
  revalidatePath("/");
  return { ok: true };
}
