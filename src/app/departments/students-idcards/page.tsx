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

export default async function StudentsIdcardsHubPage() {
  const supabase = await createClient();
  const admin = await isAppAdmin(supabase);

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
          <h2>داخلے، طلبہ اور شناختی کارڈ</h2>
        </div>

        {studentsAllowed || admissionsAllowed ? (
          <>
            <h3 className="form-section-title">داخلے اور طلبہ</h3>
            <p className="sub">
              نئے داخلے درج کریں، درخواستوں کا فیصلہ کریں اور طلبہ کا
              مکمل ریکارڈ دیکھیں۔
            </p>
            <div className="detail-rows">
              {admissionsAllowed ? (
                <div className="row">
                  <span>زیرِ غور درخواستیں</span>
                  <strong>
                    {pendingAdmissions === null
                      ? "—"
                      : pendingAdmissions.toLocaleString("ur-PK")}
                  </strong>
                </div>
              ) : null}
              {studentsAllowed ? (
                <div className="row">
                  <span>فعال طلبہ</span>
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
                داخلے اور طلبہ کھولیں
              </Link>
            </div>
          </>
        ) : null}

        {idcardsAllowed ? (
          <>
            <h3 className="form-section-title">شناختی کارڈ</h3>
            <p className="sub">
              فعال طلبہ کے شناختی کارڈ دیکھیں اور تصویر محفوظ کریں۔
            </p>
            <div className="detail-rows">
              <div className="row">
                <span>فعال طلبہ (جن کے کارڈ بن سکتے ہیں)</span>
                <strong>
                  {activeStudents === null
                    ? "—"
                    : activeStudents.toLocaleString("ur-PK")}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/idcards">
                شناختی کارڈ کھولیں
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
