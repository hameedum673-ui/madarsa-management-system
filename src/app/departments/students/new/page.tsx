/**
 * مرحلہ 4 — نئی طالبہ شامل کرنے کا صفحہ
 */
import Link from "next/link";
import StudentForm from "@/app/departments/students/StudentForm";
import { addStudent } from "@/app/departments/students/actions";

export default function NewStudentPage() {
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <h2>نئی طالبہ شامل کریں</h2>
        </div>
        <StudentForm
          action={addStudent}
          submitLabel="محفوظ کریں"
          cancelHref="/departments/students"
        />
        <Link className="back-btn" href="/departments/students">
          واپس طلبہ کی فہرست
        </Link>
      </div>
    </div>
  );
}
