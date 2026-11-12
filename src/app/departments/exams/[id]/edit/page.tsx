/**
 * مرحلہ 71 — موجودہ امتحان میں ترمیم (سرور صفحہ)
 */
import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAllowedSections } from "@/lib/permissions";
import type { Exam } from "@/lib/exams";
import type { SectionId } from "@/lib/students";
import EditExamForm from "@/app/departments/exams/EditExamForm";
import { updateExam } from "@/app/departments/exams/actions";

export default async function EditExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  const exam = data as Exam;

  // مرحلہ 54 — بند شعبے کا امتحان نہیں بدلا جا سکتا
  const allowedSections = await getMyAllowedSections(supabase);
  if (exam.section && !allowedSections.has(exam.section as SectionId))
    notFound();

  const boundUpdate = updateExam.bind(null, exam.id);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href={`/departments/exams/${exam.id}`} />
          <h2>امتحان میں ترمیم</h2>
          <span className="page-count">{exam.name}</span>
        </div>
        <EditExamForm exam={exam} action={boundUpdate} />
      </div>
    </div>
  );
}
