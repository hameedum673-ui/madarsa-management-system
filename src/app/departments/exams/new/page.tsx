/**
 * مرحلہ 10 — نیا امتحان بنانے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import ExamForm from "@/app/departments/exams/ExamForm";
import { addExam } from "@/app/departments/exams/actions";
import { getActiveClasses } from "@/lib/classes";
import { createClient } from "@/lib/supabase/server";

export default async function NewExamPage() {
  const supabase = await createClient();
  const classes = await getActiveClasses(supabase);
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/exams" />
          <h2>نیا امتحان بنائیں</h2>
        </div>

        <ExamForm action={addExam} classes={classes} />
      </div>
    </div>
  );
}
