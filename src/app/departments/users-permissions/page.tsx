/**
 * مرحلہ 73 — صارفین + اختیارات کا حب: دونوں ایک بٹن میں۔
 * ڈیش بورڈ پر دونوں بٹنوں کی جگہ ایک بٹن "صارفین اور اختیارات"
 * ہے — یہ صفحہ اسی بٹن سے کھلتا ہے۔ اندر دو حصے ہیں۔
 * دونوں پرانے صفحے ویسے ہی رہتے ہیں۔ یہ حب صرف ایڈمن کے لیے
 * ہے — دونوں شعبے ایڈمن کے لیے ہیں۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";

const USERS_PERMISSIONS_MODULES = [
  {
    id: "users",
    title: "صارفین اور اکاؤنٹس",
    desc: "نظام استعمال کرنے والے تمام صارفین کے اکاؤنٹس کا انتظام — مہمان رسائی کی ترتیب بھی یہیں ہے۔",
    href: "/departments/users",
  },
  {
    id: "permissions",
    title: "اختیارات اور اجازتیں",
    desc: "ہر صارف کے اختیارات اور شعبہ جات تک رسائی کی اجازتیں مقرر کریں۔",
    href: "/departments/permissions",
  },
] as const;

export default async function UsersPermissionsHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    notFound();
  }

  const { count } = await supabase
    .from("approved_users")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  const approvedUsers = count ?? 0;

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>صارفین اور اختیارات</h2>
        </div>

        {USERS_PERMISSIONS_MODULES.map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{m.title}</h3>
            <p className="sub">
              {m.desc}
              {m.id === "users"
                ? ` منظور شدہ صارفین: ${approvedUsers.toLocaleString("ur-PK")}`
                : ""}
            </p>
            <div className="form-actions">
              <Link className="btn-primary" href={m.href}>
                {m.title} کھولیں
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
