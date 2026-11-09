/**
 * مرحلہ 10 — نیا امتحان بنانے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import ExamForm from "@/app/departments/exams/ExamForm";
import { addExam } from "@/app/departments/exams/actions";

export default function NewExamPage() {
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/exams" />
          <h2>نیا امتحان بنائیں</h2>
        </div>

        <ExamForm action={addExam} />
      </div>
    </div>
  );
}
