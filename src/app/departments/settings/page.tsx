/**
 * مرحلہ 31 — نظام کی ترتیبات (سرور صفحہ)
 * کوئی نئی میز نہیں، کوئی SQL نہیں۔
 * میرا اکاؤنٹ (اصلی نام/کردار/Gmail/مدرسے کا نام — ڈیٹا بیس سے)، پاس ورڈ
 * تبدیل کرنا، نظام کی معلومات (اہم صفحوں کے لنک)۔
 */
import Link from "next/link";
import BackButton from "@/components/BackButton";
import ChangePasswordForm from "@/app/departments/settings/ChangePasswordForm";
import { createClient } from "@/lib/supabase/server";
import { getMyMadrasa } from "@/lib/students";
import { isAppAdmin, ROLE_LABELS } from "@/lib/approval";
import type { MadrasaRole } from "@/lib/tenancy";

export default async function SettingsPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? "";

  let madrasaName: string | null = null;
  let userName: string | null = null;
  let userRole: string | null = null;
  try {
    const mine = await getMyMadrasa(supabase);
    if (mine) {
      const { data: madrasa } = await supabase
        .from("madrasas")
        .select("name")
        .eq("id", mine.madrasaId)
        .single();
      madrasaName = (madrasa as { name?: string } | null)?.name ?? null;

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", mine.userId)
        .single();
      userName = (myProfile as { name?: string } | null)?.name ?? null;
      const role = (myProfile as { role?: string } | null)?.role;
      userRole = role ? (ROLE_LABELS[role as MadrasaRole] ?? role) : null;
    }
  } catch {
    madrasaName = null;
    userName = null;
    userRole = null;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton />
          <h2>نظام کی ترتیبات</h2>
        </div>

        <h3 className="form-section-title">میرا اکاؤنٹ</h3>
        <div className="detail-rows">
          <div className="row">
            <span>نام</span>
            <strong>{userName ?? "—"}</strong>
          </div>
          <div className="row">
            <span>کردار</span>
            <strong>{userRole ?? "—"}</strong>
          </div>
          <div className="row">
            <span>Gmail</span>
            <strong>{email || "—"}</strong>
          </div>
          <div className="row">
            <span>مدرسہ</span>
            <strong>{madrasaName ?? "—"}</strong>
          </div>
        </div>

        <ChangePasswordForm email={email} />

        <h3 className="form-section-title">نظام کی معلومات</h3>
        <div className="form-actions">
          <Link className="btn-ghost" href="/departments/backup">
            بیک اپ
          </Link>
          <Link className="btn-ghost" href="/departments/general">
            مدرسے کا عمومی ریکارڈ
          </Link>
          {admin ? (
            <Link className="btn-ghost" href="/departments/users">
              صارفین اور اکاؤنٹس
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
