/**
 * مرحلہ 13 — نیا عملہ شامل کرنے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import StaffForm from "@/app/departments/staff/StaffForm";
import { addStaff } from "@/app/departments/staff/actions";

export default function NewStaffPage() {
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/staff" />
          <h2>نیا عملہ شامل کریں</h2>
        </div>
        <StaffForm
          action={addStaff}
          submitLabel="محفوظ کریں"
          cancelHref="/departments/staff"
        />
      </div>
    </div>
  );
}
