/**
 * مرحلہ 83 — خودکار بیک اپ بنانے والا مددگار (کرون راستے کے لیے)
 * service-role کلائنٹ سے چلتا ہے (RLS سے بالاتر)، اس لیے ہر میز پر
 * مدرسے کی فلٹر خود لگائی جاتی ہے۔ کوئی سوال ناکام ہو تو غلطی پھینکی
 * جاتی ہے — آدھا/خالی بیک اپ کبھی نہیں لکھا جاتا۔
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_TABLES, OWN_TABLES } from "@/lib/backupTables";

export type BackupPayload = {
  app: "madrasa-management-system";
  exported_at: string;
  madrasa_id: string;
  tables: Record<string, unknown[]>;
};

async function fetchTable(
  admin: SupabaseClient,
  table: string,
  column: string,
  value: string | string[],
): Promise<unknown[]> {
  const query = admin.from(table).select("*");
  const { data, error } =
    typeof value === "string"
      ? await query.eq(column, value)
      : await query.in(column, value);
  if (error) {
    throw new Error(`میز ${table} نہیں پڑھی جا سکی۔`);
  }
  return (data ?? []) as unknown[];
}

export async function buildBackupPayload(
  admin: SupabaseClient,
  madrasaId: string,
): Promise<BackupPayload> {
  const tables: Record<string, unknown[]> = {};

  for (const table of OWN_TABLES) {
    if (table === "madrasas") {
      tables[table] = await fetchTable(admin, table, "id", madrasaId);
    } else {
      tables[table] = await fetchTable(admin, table, "madrasa_id", madrasaId);
    }
  }

  // ایڈمن کی میزیں: approved_users مدرسے سے، باقی ای میل سے
  const users = await fetchTable(
    admin,
    "approved_users",
    "assigned_madrasa_id",
    madrasaId,
  );
  tables["approved_users"] = users;
  const emails = (users as { email?: string }[])
    .map((u) => u.email)
    .filter((e): e is string => typeof e === "string" && e.length > 0);
  for (const table of ADMIN_TABLES) {
    if (table === "approved_users") continue;
    tables[table] =
      emails.length === 0
        ? []
        : await fetchTable(admin, table, "user_email", emails);
  }

  return {
    app: "madrasa-management-system",
    exported_at: new Date().toISOString(),
    madrasa_id: madrasaId,
    tables,
  };
}
