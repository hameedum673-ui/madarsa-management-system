/**
 * مرحلہ 47 — داخلے اور طلبہ: ایک بٹن، دو حصے (سرور صفحہ)
 * ڈیش بورڈ پر "طلبہ کا ریکارڈ" اور "نئے داخلے" کی جگہ ایک بٹن ہے —
 * یہ صفحہ اسی بٹن سے کھلتا ہے۔ اندر دو حصے ہیں:
 *   جدید داخلہ — نیا داخلہ درج کرنا + زیرِ غور درخواستیں
 *   قدیم داخلہ — پہلے سے داخل شدہ طلبہ کا ریکارڈ
 * دونوں پرانے صفحے ویسے ہی رہتے ہیں؛ اجازتیں بھی الگ الگ ہی رہتی
 * ہیں — جسے دونوں کی اجازت نہیں ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function AdmissionsStudentsPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isAppAdmin(supabase);

  let studentsAllowed = true;
  let admissionsAllowed = true;
  if (!admin) {
    const { data: sAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "students",
    });
    const { data: aAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "admissions",
    });
    // فنکشن نہ چلا تو اجازت ہے — پرانا کام نہیں رکتا
    studentsAllowed = sAllowed !== false;
    admissionsAllowed = aAllowed !== false;
  }

  // دونوں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (!studentsAllowed && !admissionsAllowed) {
    redirect("/");
  }

  let pendingAdmissions: number | null = null;
  let activeStudents: number | null = null;
  const lang = await langP;
  if (admissionsAllowed) {
    const { count } = await supabase
      .from("admissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingAdmissions = count ?? 0;
  }
  if (studentsAllowed) {
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    activeStudents = count ?? 0;
  }

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/students-idcards" />
          <h2>{t(lang, "hub.admissions_students")}</h2>
        </div>

        {admissionsAllowed ? (
          <>
            <h3 className="form-section-title">{t(lang, "hub.adm_students.sec1")}</h3>
            <p className="sub">
              {t(lang, "hub.adm_students.sec1_desc")}
            </p>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "hub.students.pending")}</span>
                <strong>
                  {pendingAdmissions === null
                    ? "—"
                    : pendingAdmissions.toLocaleString("ur-PK")}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/admissions">
                {t(lang, "hub.adm_students.open1")}
              </Link>
            </div>
          </>
        ) : null}

        {studentsAllowed ? (
          <>
            <h3 className="form-section-title">{t(lang, "hub.adm_students.sec2")}</h3>
            <p className="sub">
              {t(lang, "hub.adm_students.sec2_desc")}
            </p>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "hub.students.active")}</span>
                <strong>
                  {activeStudents === null
                    ? "—"
                    : activeStudents.toLocaleString("ur-PK")}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/students">
                {t(lang, "hub.adm_students.open2")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
