/**
 * حصہ 3 — عملے کے ارکان (صرف مدرسے کا مالک)
 * مالک اپنے مدرسے میں عملہ شامل کرتا ہے، سانچہ چنتا ہے،
 * رسائی بند/بحال کرتا ہے اور اجازتیں بدلتا ہے۔
 * نیا مدرسہ نہیں بنتا؛ عملہ مالک کے مدرسے سے جڑتا ہے۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isMadrasaOwner, type ApprovedUser } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import { PERMISSION_MODULE_IDS } from "@/lib/permissions";
import { SECTION_IDS } from "@/lib/students";
import { AddStaffForm, StaffList } from "./StaffForms";
import {
  addStaffMember,
  setStaffStatus,
  setStaffPermissions,
} from "./actions";

export default async function StaffMembersPage() {
  const supabase = await createClient();
  // حصہ 4 کی درستگی — یہ صفحہ مدرسے کے مالک کے لیے ہے (سپر ایڈمن ہونا ضروری نہیں)
  const owner = await isMadrasaOwner(supabase);
  if (!owner) {
    notFound();
  }
  const mine = await getMyMadrasa(supabase);
  if (!mine) {
    notFound();
  }

  // میرے مدرسے کا عملہ (RLS بھی صرف اپنا مدرسہ دکھاتی ہے)
  const { data } = await supabase
    .from("approved_users")
    .select(
      "id, email, name, whatsapp, status, assigned_role, assigned_madrasa_id, designation, member_type, created_at",
    )
    .eq("assigned_madrasa_id", mine.madrasaId)
    .eq("member_type", "staff")
    .order("created_at", { ascending: false });
  const staff = (data ?? []) as ApprovedUser[];
  const emails = staff.map((s) => s.email.toLowerCase());

  // ہر عملے کی مؤثر اجازتیں — کوئی قطار نہ ہو تو اجازت سمجھی جاتی ہے
  // (مرحلہ 26 کا اصول)، اس لیے واضح "نہیں" والی قطاریں ہٹا دی جاتی ہیں۔
  const permissionsByEmail: Record<
    string,
    { modules: string[]; sections: string[] }
  > = {};
  for (const email of emails) {
    permissionsByEmail[email] = {
      modules: [...PERMISSION_MODULE_IDS],
      sections: [...SECTION_IDS],
    };
  }
  if (emails.length > 0) {
    const { data: permData } = await supabase
      .from("user_permissions")
      .select("user_email, module, allowed")
      .in("user_email", emails);
    for (const row of (permData ?? []) as {
      user_email: string;
      module: string;
      allowed: boolean;
    }[]) {
      const entry = permissionsByEmail[row.user_email.toLowerCase()];
      if (entry && row.allowed === false) {
        entry.modules = entry.modules.filter((m) => m !== row.module);
      }
    }
    const { data: secData } = await supabase
      .from("user_sections")
      .select("user_email, section, allowed")
      .in("user_email", emails);
    for (const row of (secData ?? []) as {
      user_email: string;
      section: string;
      allowed: boolean;
    }[]) {
      const entry = permissionsByEmail[row.user_email.toLowerCase()];
      if (entry && row.allowed === false) {
        entry.sections = entry.sections.filter((s) => s !== row.section);
      }
    }
  }

  return (
    <main className="page">
      <BackButton href="/departments/users-permissions" />
      <h2>عملے کے ارکان</h2>
      <p className="sub">
        یہاں آپ اپنے مدرسے کا عملہ شامل کرتے ہیں۔ عملہ آپ کے مدرسے سے جڑتا
        ہے — اس کا اپنا الگ مدرسہ نہیں بنتا۔ وہ صرف وہی شعبے دیکھے گا جو آپ
        کھولیں گے؛ تنخواہیں، بیک اپ، عمومی ریکارڈ اور صارفین شامل کرنا ہمیشہ
        صرف آپ کے لیے رہیں گے۔ جس Gmail کا اپنا مدرسہ پہلے سے ہے، اسے عملہ
        نہیں بنایا جا سکتا۔
      </p>

      <section className="page-card">
        <AddStaffForm action={addStaffMember} />
      </section>

      <section className="page-card">
        <h3 className="form-section-title">میرا عملہ</h3>
        <StaffList
          staff={staff}
          permissionsByEmail={permissionsByEmail}
          statusAction={setStaffStatus}
          permissionsAction={setStaffPermissions}
        />
      </section>
    </main>
  );
}
