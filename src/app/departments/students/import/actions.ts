/**
 * CSV درآمد — طالبات (پرانا ڈیٹا ایک ساتھ)
 *
 * دو مرحلے: پہلے پیش نظارہ (کچھ محفوظ نہیں ہوتا)، پھر تصدیق۔
 * تصدیق پر ہر قطار دوبارہ جانچی جاتی ہے — کلائنٹ سے آنے والے
 * ڈیٹا پر کبھی بھروسا نہیں۔ صرف اپنے مدرسے میں درآمد؛ فائل سے
 * مدرسے کا id کبھی نہیں لیا جاتا۔ مالک/ایڈمن کے لیے ہے۔
 */
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import {
  getMyAllowedSections,
  isModuleAllowedForMe,
} from "@/lib/permissions";
import { getMyMadrasa } from "@/lib/students";
import {
  getAllAcademicYears,
  upsertEnrollmentForYear,
} from "@/lib/academicYears";
import { isLang, t, type Lang } from "@/i18n/dictionary";
import {
  IMPORT_HEADERS,
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  duplicateKey,
  parseCsv,
  validateImportRow,
  type ImportRow,
} from "@/lib/csvImport";

function formLang(formData: FormData): Lang {
  const v = typeof formData.get("lang") === "string" ? formData.get("lang") : null;
  return isLang(v) && v !== "en" ? v : "ur";
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

async function writeAudit(
  supabase: ServerClient,
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

/** مالک یا ایڈمن + طلبہ ماڈیول کی اجازت — دونوں لازم */
async function canImport(
  supabase: ServerClient,
): Promise<{ madrasaId: string; userId: string } | null> {
  const mine = await getMyMadrasa(supabase);
  if (!mine) return null;
  const [admin, owner, moduleOk] = await Promise.all([
    isAppAdmin(supabase),
    isMadrasaOwner(supabase),
    isModuleAllowedForMe(supabase, "students"),
  ]);
  if (!(admin || owner) || !moduleOk) return null;
  return mine;
}

export interface PreviewErrorRow {
  row: number;
  reason: string;
}
export interface PreviewDuplicateRow {
  row: number;
  name: string;
  fatherName: string;
}
export type PreviewResult =
  | {
      ok: true;
      yearId: string;
      yearLabel: string;
      valid: ImportRow[];
      errors: PreviewErrorRow[];
      duplicates: PreviewDuplicateRow[];
      totalRows: number;
    }
  | { error: string };

/** پہلا مرحلہ — فائل پڑھیں، جانچیں، پیش نظارہ دیں (کچھ محفوظ نہیں ہوتا) */
export async function previewImport(
  formData: FormData,
): Promise<PreviewResult> {
  const lang = formLang(formData);
  const supabase = await createClient();
  const mine = await canImport(supabase);
  if (!mine) return { error: t(lang, "common.not_allowed") };

  const yearId =
    typeof formData.get("academic_year_id") === "string"
      ? (formData.get("academic_year_id") as string).trim()
      : "";
  const years = await getAllAcademicYears(supabase, mine.madrasaId);
  const year = years.find((y) => y.id === yearId);
  if (!year) return { error: t(lang, "student.past_enroll.err.year") };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: t(lang, "student.import.err.no_file") };
  if (file.size > IMPORT_MAX_BYTES)
    return { error: t(lang, "student.import.err.file_big") };

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: t(lang, "student.import.err.parse_failed") };
  }
  const records = parseCsv(text);
  if (records.length === 0)
    return { error: t(lang, "student.import.err.no_rows") };
  const header = records[0].map((h) => h.trim().toLowerCase());
  // سرخی: نئی فائل (9 کالم، پتہ سمیت) یا پرانی فائل (8 کالم، پتہ
  // بغیر) — دونوں چلیں؛ کالموں کی ترتیب وہی رہے
  const headerOk =
    (header.length === IMPORT_HEADERS.length ||
      header.length === IMPORT_HEADERS.length - 1) &&
    IMPORT_HEADERS.slice(0, header.length).every((h, i) => header[i] === h);
  if (!headerOk)
    return { error: t(lang, "student.import.err.bad_header") };

  const dataRecords = records.slice(1).filter((r) => r.some((c) => c.trim() !== ""));
  if (dataRecords.length === 0)
    return { error: t(lang, "student.import.err.no_rows") };
  if (dataRecords.length > IMPORT_MAX_ROWS)
    return { error: t(lang, "student.import.err.too_many") };

  const allowedSections = await getMyAllowedSections(supabase);

  // پہلے سے موجود طالبات — نام + والد کا نام (صرف اپنے مدرسے کی)
  const { data: existing } = await supabase
    .from("students")
    .select("name, father_name")
    .eq("madrasa_id", mine.madrasaId);
  const existingKeys = new Set(
    (existing ?? []).map((s) =>
      duplicateKey(
        (s as { name: string }).name ?? "",
        (s as { father_name: string }).father_name ?? "",
      ),
    ),
  );

  const valid: ImportRow[] = [];
  const errors: PreviewErrorRow[] = [];
  const duplicates: PreviewDuplicateRow[] = [];
  const seenInFile = new Set<string>();

  dataRecords.forEach((fields, idx) => {
    const rowNumber = idx + 2; // سرخی = قطار 1
    const checked = validateImportRow(fields, rowNumber, allowedSections);
    if ("errorKey" in checked) {
      errors.push({ row: rowNumber, reason: t(lang, checked.errorKey) });
      return;
    }
    const r = checked.row;
    const key = duplicateKey(r.name, r.fatherName);
    if (existingKeys.has(key) || seenInFile.has(key)) {
      duplicates.push({ row: rowNumber, name: r.name, fatherName: r.fatherName });
      return;
    }
    seenInFile.add(key);
    valid.push(r);
  });

  return {
    ok: true,
    yearId: year.id,
    yearLabel: year.label,
    valid,
    errors,
    duplicates,
    totalRows: dataRecords.length,
  };
}

export type ConfirmResult =
  | {
      ok: true;
      yearLabel: string;
      added: number;
      skipped: PreviewErrorRow[];
    }
  | { error: string };

/** دوسرا مرحلہ — درست قطاریں ڈالیں (ہر قطار دوبارہ جانچ کر) */
export async function confirmImport(
  formData: FormData,
): Promise<ConfirmResult> {
  const lang = formLang(formData);
  const supabase = await createClient();
  const mine = await canImport(supabase);
  if (!mine) return { error: t(lang, "common.not_allowed") };

  const yearId =
    typeof formData.get("academic_year_id") === "string"
      ? (formData.get("academic_year_id") as string).trim()
      : "";
  const years = await getAllAcademicYears(supabase, mine.madrasaId);
  const year = years.find((y) => y.id === yearId);
  if (!year) return { error: t(lang, "student.past_enroll.err.year") };

  let rows: ImportRow[];
  try {
    const raw = formData.get("rows");
    rows = typeof raw === "string" ? (JSON.parse(raw) as ImportRow[]) : [];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > IMPORT_MAX_ROWS)
      return { error: t(lang, "student.import.err.confirm_failed") };
  } catch {
    return { error: t(lang, "student.import.err.confirm_failed") };
  }

  const allowedSections = await getMyAllowedSections(supabase);
  const { data: existing } = await supabase
    .from("students")
    .select("name, father_name")
    .eq("madrasa_id", mine.madrasaId);
  const existingKeys = new Set(
    (existing ?? []).map((s) =>
      duplicateKey(
        (s as { name: string }).name ?? "",
        (s as { father_name: string }).father_name ?? "",
      ),
    ),
  );

  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("madrasa_id", mine.madrasaId);
  let nextNumber = (count ?? 0) + 1;

  let added = 0;
  const skipped: PreviewErrorRow[] = [];
  const seenInBatch = new Set<string>();

  for (const r of rows) {
    const rowNumber = typeof r.row === "number" ? r.row : 0;
    // قطار دوبارہ بنائیں (کلائنٹ کے ڈیٹا پر بھروسا نہیں)
    const fields: string[] = IMPORT_HEADERS.map((h) => {
      switch (h) {
        case "name":
          return r.name ?? "";
        case "father_name":
          return r.fatherName ?? "";
        case "guardian_name":
          return r.guardianName ?? "";
        case "department":
          return r.department ?? "";
        case "section":
          return r.section ?? "";
        case "class_name":
          return r.className ?? "";
        case "admission_date":
          return r.admissionDate ?? "";
        case "district":
          return r.district ?? "";
        case "address":
          return r.address ?? "";
        default:
          return "";
      }
    });
    const checked = validateImportRow(fields, rowNumber, allowedSections);
    if ("errorKey" in checked) {
      skipped.push({ row: rowNumber, reason: t(lang, checked.errorKey) });
      continue;
    }
    const clean = checked.row;
    const key = duplicateKey(clean.name, clean.fatherName);
    if (existingKeys.has(key) || seenInBatch.has(key)) {
      skipped.push({
        row: rowNumber,
        reason: t(lang, "student.import.dup_reason"),
      });
      continue;
    }
    seenInBatch.add(key);

    const registrationNumber = String(nextNumber).padStart(4, "0");
    const { data, error } = await supabase
      .from("students")
      .insert({
        madrasa_id: mine.madrasaId,
        registration_number: registrationNumber,
        name: clean.name,
        father_name: clean.fatherName,
        guardian_name: clean.guardianName || null,
        department: clean.department,
        section: clean.section,
        class_name: clean.className || null,
        admission_date: clean.admissionDate,
        district: clean.district || null,
        address: clean.address || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !data) {
      if ((error as { code?: string } | null)?.code === "23505") {
        // نمبر ٹکرا گیا (دو لوگ ایک ساتھ لکھیں) — گنتی تازہ کر کے ایک بار پھر
        const { count: fresh } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("madrasa_id", mine.madrasaId);
        nextNumber = (fresh ?? 0) + 1;
        const retry = await supabase
          .from("students")
          .insert({
            madrasa_id: mine.madrasaId,
            registration_number: String(nextNumber).padStart(4, "0"),
            name: clean.name,
            father_name: clean.fatherName,
            guardian_name: clean.guardianName || null,
            department: clean.department,
            section: clean.section,
            class_name: clean.className || null,
            admission_date: clean.admissionDate,
            district: clean.district || null,
            address: clean.address || null,
            status: "active",
          })
          .select("id")
          .single();
        if (retry.error || !retry.data) {
          skipped.push({
            row: rowNumber,
            reason: t(lang, "student.err.save_failed"),
          });
          continue;
        }
        nextNumber += 1;
        existingKeys.add(key);
        await upsertEnrollmentForYear(
          supabase,
          mine.madrasaId,
          retry.data.id as string,
          year.id,
          clean.className || null,
          clean.department,
          clean.section,
        );
        added += 1;
        continue;
      }
      skipped.push({
        row: rowNumber,
        reason: t(lang, "student.err.save_failed"),
      });
      continue;
    }

    nextNumber += 1;
    existingKeys.add(key);
    await upsertEnrollmentForYear(
      supabase,
      mine.madrasaId,
      data.id as string,
      year.id,
      clean.className || null,
      clean.department,
      clean.section,
    );
    added += 1;
  }

  await writeAudit(supabase, mine.madrasaId, mine.userId, "students_imported", {
    year_id: year.id,
    year_label: year.label,
    added: String(added),
    skipped: String(skipped.length),
  });

  revalidatePath("/departments/students");
  revalidatePath("/");
  return { ok: true, yearLabel: year.label, added, skipped };
}
