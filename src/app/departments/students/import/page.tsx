/**
 * CSV درآمد — طالبات (صرف مالک / ایڈمن)
 * سال چنیں + فائل اپ لوڈ کریں → پیش نظارہ → تصدیق۔
 */
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import { getAllAcademicYears } from "@/lib/academicYears";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import ImportForm from "./ImportForm";

export default async function StudentsImportPage() {
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
  const years = await getAllAcademicYears(supabase, mine.madrasaId);

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/students" />
          <h2>{t(lang, "student.import.title")}</h2>
        </div>
        <ImportForm lang={lang} years={years} />
      </div>
    </div>
  );
}
