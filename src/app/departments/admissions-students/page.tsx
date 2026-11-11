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

export default async function AdmissionsStudentsPage() {
  const supabase = await createClient();
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
          <BackButton />
          <h2>داخلے اور طلبہ</h2>
        </div>

        {admissionsAllowed ? (
          <>
            <h3 className="form-section-title">جدید داخلہ</h3>
            <p className="sub">
              نیا داخلہ درج کریں اور زیرِ غور درخواستوں کا فیصلہ کریں۔
            </p>
            <div className="detail-rows">
              <div className="row">
                <span>زیرِ غور درخواستیں</span>
                <strong>
                  {pendingAdmissions === null
                    ? "—"
                    : pendingAdmissions.toLocaleString("ur-PK")}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/admissions">
                جدید داخلہ کھولیں
              </Link>
            </div>
          </>
        ) : null}

        {studentsAllowed ? (
          <>
            <h3 className="form-section-title">قدیم داخلہ</h3>
            <p className="sub">
              پہلے سے داخل شدہ طلبہ کا مکمل ریکارڈ دیکھیں اور تبدیل کریں۔
            </p>
            <div className="detail-rows">
              <div className="row">
                <span>فعال طلبہ</span>
                <strong>
                  {activeStudents === null
                    ? "—"
                    : activeStudents.toLocaleString("ur-PK")}
                </strong>
              </div>
            </div>
            <div className="form-actions">
              <Link className="btn-primary" href="/departments/students">
                قدیم داخلہ کھولیں
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
