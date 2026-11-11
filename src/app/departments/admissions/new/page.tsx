/**
 * مرحلہ 9 — نئی داخلہ درخواست کا صفحہ
 */
import BackButton from "@/components/BackButton";
import AdmissionForm from "@/app/departments/admissions/AdmissionForm";
import { addAdmission } from "@/app/departments/admissions/actions";
import { getActiveClasses } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";

export default async function NewAdmissionPage() {
  const supabase = await createClient();
  const classes = await getActiveClasses(supabase);
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/admissions" />
          <h2>نئی داخلہ درخواست</h2>
        </div>

        <AdmissionForm action={addAdmission} classes={classes} />
      </div>
    </div>
  );
}
