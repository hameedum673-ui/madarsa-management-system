/**
 * CSV درآمد — نمبر ایک ساتھ (صرف مالک / ایڈمن)
 * امتحان چنیں + فائل اپ لوڈ کریں → پیش نظارہ → تصدیق۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import ImportForm from "./ImportForm";

export interface ImportExam {
  id: string;
  name: string;
  subjects: string[];
  exam_date: string | null;
}

export default async function MarksImportPage() {
  const supabase = await createClient();
  const langP = getMyLanguage();
  const [admin, owner] = await Promise.all([
    isAppAdmin(supabase),
    isMadrasaOwner(supabase),
  ]);
  if (!(admin || owner)) {
    notFound();
  }
  const mine = await getMyMadrasa(supabase);
  if (!mine) {
    notFound();
  }
  const lang = await langP;
  const { data } = await supabase
    .from("exams")
    .select("id, name, subjects, exam_date")
    .eq("madrasa_id", mine.madrasaId)
    .order("exam_date", { ascending: false });
  const exams: ImportExam[] = ((data ?? []) as {
    id: string;
    name: string;
    subjects: unknown;
    exam_date: string | null;
  }[]).map((e) => ({
    id: e.id,
    name: e.name ?? "",
    subjects: Array.isArray(e.subjects) ? (e.subjects as string[]) : [],
    exam_date: e.exam_date,
  }));

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/exams" />
          <h2>{t(lang, "exam.marks_import.title")}</h2>
        </div>
        <ImportForm lang={lang} exams={exams} />
      </div>
    </div>
  );
}
