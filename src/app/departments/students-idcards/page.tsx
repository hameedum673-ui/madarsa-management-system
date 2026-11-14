/**
 * مرحلہ 78 — داخلے، طلبہ اور شناختی کارڈ کا حب: تینوں ایک بٹن میں۔
 * ڈیش بورڈ پر "داخلے اور طلبہ" اور "طلبہ کے شناختی کارڈ" کی جگہ ایک
 * بٹن "داخلے، طلبہ اور شناختی کارڈ" ہے — یہ صفحہ اسی بٹن سے کھلتا
 * ہے۔ اندر دو حصے ہیں:
 *   داخلے اور طلبہ — پرانا hub (/departments/admissions-students)
 *   شناختی کارڈ — کارڈوں کی فہرست (/departments/idcards)
 * تینوں پرانے صفحے ویسے ہی رہتے ہیں؛ اجازتیں بھی الگ الگ ہی رہتی
 * ہیں — جسے تینوں کی اجازت نہیں ہے، وہ یہ صفحہ نہیں کھول سکتا۔
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin } from "@/lib/approval";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function StudentsIdcardsHubPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const admin = await isAppAdmin(supabase);
  const lang = await langP;

  let studentsAllowed = true;
  let admissionsAllowed = true;
  let idcardsAllowed = true;
  if (!admin) {
    const { data: sAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "students",
    });
    const { data: aAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "admissions",
    });
    const { data: iAllowed } = await supabase.rpc("my_module_allowed", {
      p_module: "idcards",
    });
    // فنکشن نہ چلا تو اجازت ہے — پرانا کام نہیں رکتا
    studentsAllowed = sAllowed !== false;
    admissionsAllowed = aAllowed !== false;
    idcardsAllowed = iAllowed !== false;
  }

  // تینوں کی اجازت نہیں ہے → ڈیش بورڈ پر واپس
  if (!studentsAllowed && !admissionsAllowed && !idcardsAllowed) {
    redirect("/");
  }

  let pendingAdmissions: number | null = null;
  let activeStudents: number | null = null;
  if (admissionsAllowed) {
    const { count } = await supabase
      .from("admissions")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    pendingAdmissions = count ?? 0;
  }
  if (studentsAllowed || idcardsAllowed) {
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
          <BackButton />
          <h2>{t(lang, "hub.students.title")}</h2>
        </div>

        {studentsAllowed || admissionsAllowed ? (
          <>
            <h3 className="form-section-title">{t(lang, "hub.students.sec1")}</h3>
            <p className="sub">{t(lang, "hub.students.sec1_desc")}</p>
            <div className="detail-rows">
              {admissionsAllowed ? (
                <div className="row">
                  <span>{t(lang, "hub.students.pending")}</span>
                  <strong>
                    {pendingAdmissions === null
                      ? "—"
                      : pendingAdmissions.toLocaleString("ur-PK")}
                  </strong>
                </div>
              ) : null}
              {studentsAllowed ? (
                <div className="row">
                  <span>{t(lang, "hub.students.active")}</span>
                  <strong>
                    {activeStudents === null
                      ? "—"
                      : activeStudents.toLocaleString("ur-PK")}
                  </strong>
                </div>
              ) : null}
            </div>
            <div className="form-actions">
              <Link
                className="btn-primary"
                href="/departments/admissions-students"
              >
                {t(lang, "hub.students.open1")}
              </Link>
            </div>
          </>
        ) : null}

        {idcardsAllowed ? (
          <>
            <h3 className="form-section-title">{t(lang, "hub.students.sec2")}</h3>
            <p className="sub">{t(lang, "hub.students.sec2_desc")}</p>
            <div className="detail-rows">
              <div className="row">
                <span>{t(lang, "hub.students.active_cards")}</span>
                <strong>
                  {activeStudents === null
                    ? "—"
                    : activeStudents.toLocaleString("ur-PK")}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/idcards">
                {t(lang, "hub.students.open2")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
