/**
 * مرحلہ 73 — صارفین + اختیارات کا حب: دونوں ایک بٹن میں۔
 * ڈیش بورڈ پر دونوں بٹنوں کی جگہ ایک بٹن "صارفین اور اختیارات"
 * ہے — یہ صفحہ اسی بٹن سے کھلتا ہے۔ اندر دو حصے ہیں۔
 * دونوں پرانے صفحے ویسے ہی رہتے ہیں۔ یہ حب صرف ایڈمن کے لیے
 * ہے — دونوں شعبے ایڈمن کے لیے ہیں۔
 * حصہ 2 — نظام کے ایڈمن کو دونوں حصے ویسے ہی نظر آتے ہیں؛ مدرسے
 * کے مالک کو صرف "عملے کے ارکان" والا حصہ نظر آتا ہے (عملے والا
 * صفحہ حصہ 3 میں بنے گا)۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isSystemAdmin } from "@/lib/approval";

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

type HubModule = { id: string; title: string; desc: string; href: string };

const STAFF_MODULE: HubModule = {
  id: "staff",
  title: "عملے کے ارکان",
  desc: "اپنے مدرسے کے عملے (ناظم تعلیمات، ناظم مالیات وغیرہ) کو شامل کریں اور ان کی اجازتیں مقرر کریں۔",
  href: "/departments/staff-members",
};

export default async function UsersPermissionsHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    notFound();
  }
  // حصہ 2 — نظام کا ایڈمن یا مدرسے کا مالک؟
  const systemAdmin = await isSystemAdmin(supabase);
  const modules: HubModule[] = systemAdmin
    ? [...USERS_PERMISSIONS_MODULES]
    : [STAFF_MODULE];

  const { count } = await supabase
    .from("approved_users")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");
  const approvedUsers = count ?? 0;

  // مالک کے اپنے مدرسے کا فعال عملہ (RLS خود صرف اپنا مدرسہ دکھاتی ہے)
  let staffCount = 0;
  if (!systemAdmin) {
    const { count: sc } = await supabase
      .from("approved_users")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .eq("member_type", "staff");
    staffCount = sc ?? 0;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>صارفین اور اختیارات</h2>
        </div>

        {modules.map((m) => (
          <div key={m.id}>
            <h3 className="form-section-title">{m.title}</h3>
            <p className="sub">
              {m.desc}
              {m.id === "users"
                ? ` منظور شدہ صارفین: ${approvedUsers.toLocaleString("ur-PK")}`
                : m.id === "staff"
                  ? ` فعال عملہ: ${staffCount.toLocaleString("ur-PK")}`
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
