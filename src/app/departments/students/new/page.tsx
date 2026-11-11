/**
 * مرحلہ 4 — نئی طالبہ شامل کرنے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import StudentForm from "@/app/departments/students/StudentForm";
import { addStudent } from "@/app/departments/students/actions";
import { getActiveClasses } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";

export default async function NewStudentPage() {
  const supabase = await createClient();
  const classes = await getActiveClasses(supabase);
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/students" />
          <h2>نئی طالبہ شامل کریں</h2>
        </div>
        <StudentForm
          action={addStudent}
          submitLabel="محفوظ کریں"
          cancelHref="/departments/students"
          classes={classes}
        />
      </div>
    </div>
  );
}
