/**
 * «میرا پروفائل» کا صفحہ — صارف کے مینو سے کھلتا ہے۔
 * مرحلہ 31 کی درستی: اب لکھا ہوا نام/عہدہ نہیں — اصلی لاگ اِن صارف کی
 * معلومات ڈیٹا بیس سے دکھائی جاتی ہیں۔
 */
import ModuleCard from "@/components/ModuleCard";
import LogoForm from "@/app/profile/LogoForm";
import ProfileForm from "@/app/profile/ProfileForm";
import { createClient } from "@/lib/supabase/server";
import { isMadrasaOwner } from "@/lib/approval";
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
  let userWhatsapp = "";
  let madrasaLogoUrl: string | null = null;
  let canManageLogo = false;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: madrasa } = await supabase
        .from("madrasas")
        .select("name")
        .eq("id", mine.madrasaId)
        .single();
      madrasaName = (madrasa as { name?: string } | null)?.name ?? "—";

      // مرحلہ 98 — مدرسے کا لوگو (الگ سوال، تاکہ migration 051 نہ چلی
      // ہو تو صرف لوگو خالی رہے، باقی معلومات ویسے ہی ملیں)
      try {
        const { data: profile, error } = await supabase
          .from("madrasa_profile")
          .select("logo_url")
          .eq("madrasa_id", mine.madrasaId)
          .maybeSingle();
        if (!error && profile)
          madrasaLogoUrl =
            (profile.logo_url as string | undefined) ?? null;
      } catch {
        madrasaLogoUrl = null;
      }
      try {
        canManageLogo = await isMadrasaOwner(supabase);
      } catch {
        canManageLogo = false;
      }

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", mine.userId)
        .single();
      userName = (myProfile as { name?: string } | null)?.name ?? "—";
      const role = (myProfile as { role?: string } | null)?.role;
      userRole = role ? (ROLE_LABELS[role as MadrasaRole] ?? role) : "—";

      // مرحلہ 86 — اپنا واٹس ایپ نمبر (اپنی قطار پڑھنے کی پالیسی سے؛
      // مہمان کی کوئی منظوری والی قطار نہیں — خالی رہتا ہے)
      if (email) {
        const { data: approved } = await supabase
          .from("approved_users")
          .select("whatsapp")
          .eq("email", email.toLowerCase())
          .maybeSingle();
        userWhatsapp =
          (approved as { whatsapp?: string | null } | null)?.whatsapp ?? "";
      }
    }
  } catch {
    madrasaName = "—";
    userName = "—";
    userRole = "—";
    userWhatsapp = "";
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
      hideUnderConstruction
      extra={
        <>
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
          {/* مرحلہ 86 — اپنی پروفائل بدلنا */}
          <ProfileForm
            initialName={userName === "—" ? "" : userName}
            initialWhatsapp={userWhatsapp}
          />
          {/* مرحلہ 98 — مدرسے کا لوگو */}
          <LogoForm
            logoUrl={madrasaLogoUrl}
            canManage={canManageLogo}
            madrasaName={madrasaName === "—" ? "" : madrasaName}
          />
        </>
      }
    />
  );
}
