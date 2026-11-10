/**
 * «میرا پروفائل» کا صفحہ — صارف کے مینو سے کھلتا ہے۔
 * مرحلہ 31 کی درستی: اب لکھا ہوا نام/عہدہ نہیں — اصلی لاگ اِن صارف کی
 * معلومات ڈیٹا بیس سے دکھائی جاتی ہیں۔
 */
import ModuleCard from "@/components/ModuleCard";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { ROLE_LABELS } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  let madrasaName = "—";
  let userName = "—";
  let userRole = "—";
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: madrasa } = await supabase
        .from("madrasas")
        .select("name")
        .eq("id", mine.madrasaId)
        .single();
      madrasaName = (madrasa as { name?: string } | null)?.name ?? "—";

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", mine.userId)
        .single();
      userName = (myProfile as { name?: string } | null)?.name ?? "—";
      const role = (myProfile as { role?: string } | null)?.role;
      userRole = role ? (ROLE_LABELS[role as MadrasaRole] ?? role) : "—";
    }
  } catch {
    madrasaName = "—";
    userName = "—";
    userRole = "—";
  }

  return (
    <ModuleCard
      department={{
        id: "profile",
        label: "میرا پروفائل",
        icon: "users",
        group: "اکاؤنٹ",
        desc: "",
      }}
      extra={
        <div className="profile-rows">
          <div className="row">
            <span>نام</span>
            <span>{userName}</span>
          </div>
          <div className="row">
            <span>عہدہ</span>
            <span>{userRole}</span>
          </div>
          <div className="row">
            <span>Gmail</span>
            <span>{email || "—"}</span>
          </div>
          <div className="row">
            <span>ادارہ</span>
            <span>{madrasaName}</span>
          </div>
        </div>
      }
    />
  );
}
