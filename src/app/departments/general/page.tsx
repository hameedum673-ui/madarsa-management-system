/**
 * مرحلہ 24 + مرحلہ 25 — مدرسے کا عمومی ریکارڈ (سرور صفحہ)
 * ہر صارف صرف اپنے مدرسے کا ریکارڈ دیکھ/بدل سکتا ہے — RLS پالیسیاں یہ
 * یقین دلاتی ہیں (مرحلہ 25 سے ہر صارف کا اپنا الگ مدرسہ ہے)۔ نام
 * `madrasas` میز سے، باقی معلومات `madrasa_profile` سے۔
 * میز ابھی نہ بنی ہو (migration 017 نہ چلی ہو) تو صاف پیغام دکھایا جاتا ہے۔
 * حصہ 4 — یہ صفحہ صرف مدرسے کے مالک کے لیے ہے (عملہ مدرسے کا نام/پتہ نہیں بدل سکتا)۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import type {
  MadrasaProfile,
  MadrasaProfileFormValues,
} from "@/lib/madrasaProfile";
import ProfileForm from "@/app/departments/general/ProfileForm";
import { updateMadrasaProfile } from "@/app/departments/general/actions";

export default async function GeneralPage() {
  const supabase = await createClient();

  const mine = await getMyMadrasa(supabase);
  if (!mine) {
    notFound();
  }

  // حصہ 4 — عمومی ریکارڈ صرف مالک کے لیے
  const admin = await isAppAdmin(supabase);
  if (!admin) {
    notFound();
  }

  const { data: madrasa } = await supabase
    .from("madrasas")
    .select("name")
    .eq("id", mine.madrasaId)
    .single();

  const { data: profileData, error: profileError } = await supabase
    .from("madrasa_profile")
    .select("*")
    .eq("madrasa_id", mine.madrasaId)
    .single();

  const tableMissing =
    (profileError as { code?: string } | null)?.code === "42P01";
  const profile = (profileData ?? null) as MadrasaProfile | null;

  const initial: MadrasaProfileFormValues = {
    name: (madrasa?.name as string) ?? "",
    address: profile?.address ?? "",
    phone: profile?.phone ?? "",
    whatsapp: profile?.whatsapp ?? "",
    email: profile?.email ?? "",
    mohtamim_name: profile?.mohtamim_name ?? "",
    established_year:
      profile?.established_year != null
        ? String(profile.established_year)
        : "",
    registration_no: profile?.registration_no ?? "",
    note: profile?.note ?? "",
  };

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>مدرسے کا عمومی ریکارڈ</h2>
        </div>
        {tableMissing ? (
          <p className="empty-state">
            مدرسے کے ریکارڈ کی میز ابھی نہیں بنی — پہلے مرحلہ 24 کی SQL چلائیں۔
          </p>
        ) : (
          <>
            <p className="sub">
              یہ معلومات صرف آپ کے اپنے مدرسے کی ہیں۔ نام بدلنے پر ڈیش بورڈ
              کے اوپر والے حصے، نیچے والے حصے اور رسیدوں/کارڈوں پر نیا نام
              نظر آئے گا۔
            </p>
            <ProfileForm initial={initial} action={updateMadrasaProfile} />
          </>
        )}
      </div>
    </div>
  );
}
