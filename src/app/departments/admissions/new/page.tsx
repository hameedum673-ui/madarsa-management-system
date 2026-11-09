/**
 * مرحلہ 9 — نئی داخلہ درخواست کا صفحہ
 */
import BackButton from "@/components/BackButton";
import AdmissionForm from "@/app/departments/admissions/AdmissionForm";
import { addAdmission } from "@/app/departments/admissions/actions";

export default function NewAdmissionPage() {
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/admissions" />
          <h2>نئی داخلہ درخواست</h2>
        </div>

        <AdmissionForm action={addAdmission} />
      </div>
    </div>
  );
}
