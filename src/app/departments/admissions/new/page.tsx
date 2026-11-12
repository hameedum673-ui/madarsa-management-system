/**
 * مرحلہ 9 — نئی داخلہ درخواست کا صفحہ
 */
import BackButton from "@/components/BackButton";
import AdmissionForm, {
  type AdmissionStudent,
} from "@/app/departments/admissions/AdmissionForm";
import { addAdmission } from "@/app/departments/admissions/actions";
import { getActiveClasses } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import type { SectionId } from "@/lib/students";

export default async function NewAdmissionPage() {
  const supabase = await createClient();
  const classes = await getActiveClasses(supabase);
  // مرحلہ 74 — قدیم داخلے کے لیے پرانی طالبات (فعال + خارج — واپس
  // آنے والی خارج طالبہ بھی چنی جا سکے)؛ صرف اجازت والے شعبے کی
  const allowedSections = await getMyAllowedSections(supabase);
  const { data } = await supabase
    .from("students")
    .select(
      "id, name, father_name, registration_number, class_name, department, section, date_of_birth, guardian_name, guardian_phone, whatsapp_number, status",
    )
    .order("name", { ascending: true });
  const students = ((data ?? []) as AdmissionStudent[]).filter((s) =>
    allowedSections.has(s.section as SectionId),
  );
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/admissions" />
          <h2>نئی داخلہ درخواست</h2>
        </div>

        <AdmissionForm
          action={addAdmission}
          classes={classes}
          students={students}
        />
      </div>
    </div>
  );
}
