/**
 * مرحلہ 5 — نیا استاد شامل کرنے کا صفحہ
 */
import Link from "next/link";
import TeacherForm from "@/app/departments/teachers/TeacherForm";
import { addTeacher } from "@/app/departments/teachers/actions";

export default function NewTeacherPage() {
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <h2>نیا استاد شامل کریں</h2>
        </div>
        <TeacherForm
          action={addTeacher}
          submitLabel="محفوظ کریں"
          cancelHref="/departments/teachers"
        />
        <Link className="back-btn" href="/departments/teachers">
          واپس اساتذہ کی فہرست
        </Link>
      </div>
    </div>
  );
}
