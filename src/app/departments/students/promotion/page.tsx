/**
 * اگلے سال میں ترقی — صرف مالک / ایڈمن
 * موجودہ سال کی فعال طالبات → جائزہ (اگلی جماعت، "دوبارہ" کا نشان)
 * → تصدیق → نئے سال میں اندراج۔ کوئی SQL نہیں۔
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import { createClient } from "@/lib/supabase/server";
import { isAppAdmin, isMadrasaOwner } from "@/lib/approval";
import { getMyMadrasa } from "@/lib/students";
import {
  buildPromotionPreview,
  getAllAcademicYears,
  getCurrentAcademicYear,
} from "@/lib/academicYears";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";
import PromotionForm from "./PromotionForm";

export default async function PromotionPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
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
  const source = await getCurrentAcademicYear(supabase, mine.madrasaId);

  // موجودہ سال یا نیا سال نہ بنا ہو تو صفحہ بتا دے گا — ترقی نہیں ہو گی
  if (!source) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/settings" />
            <h2>{t(lang, "promotion.title")}</h2>
          </div>
          <p className="sub">{t(lang, "promotion.no_source")}</p>
          <div className="form-actions">
            <Link className="btn-primary" href="/departments/settings">
              {t(lang, "settings.title")}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  const targets = years
    .filter((y) => y.start_date > source.start_date)
    .sort((a, b) => (a.start_date < b.start_date ? -1 : 1));
  if (targets.length === 0) {
    return (
      <div className="module-view open">
        <div className="page-card">
          <div className="page-head">
            <BackButton href="/departments/settings" />
            <h2>{t(lang, "promotion.title")}</h2>
          </div>
          <p className="sub">{t(lang, "promotion.no_target")}</p>
          <div className="form-actions">
            <Link className="btn-primary" href="/departments/settings">
              {t(lang, "settings.title")}
            </Link>
          </div>
        </div>
      </div>
    );
  }
  const sp = await searchParams;
  const target =
    targets.find((y) => y.id === (sp.year ?? "").trim()) ?? targets[0];

  // جائزہ — موجودہ سال کی فعال طالبات + ان کا اندراج + فعال جماعتیں
  const { data: studentsData } = await supabase
    .from("students")
    .select(
      "id, name, father_name, registration_number, class_name, department, section",
    )
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active")
    .order("registration_number", { ascending: true });
  const { data: enrData } = await supabase
    .from("enrollments")
    .select("student_id, class_name, department, section")
    .eq("madrasa_id", mine.madrasaId)
    .eq("academic_year_id", source.id)
    .eq("status", "active");
  const { data: classData } = await supabase
    .from("classes")
    .select("name, department, section, sort_order")
    .eq("madrasa_id", mine.madrasaId)
    .eq("status", "active");
  const preview = buildPromotionPreview(
    (studentsData ?? []) as {
      id: string;
      name: string;
      father_name: string;
      registration_number: string;
      class_name: string | null;
      department: string;
      section: string;
    }[],
    (enrData ?? []) as {
      student_id: string;
      class_name: string | null;
      department: string;
      section: string;
    }[],
    (classData ?? []) as {
      name: string;
      department: string;
      section: string;
      sort_order: number;
    }[],
  );

  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/settings" />
          <h2>{t(lang, "promotion.title")}</h2>
        </div>
        <PromotionForm
          lang={lang}
          source={source}
          targets={targets}
          targetId={target.id}
          preview={preview}
        />
      </div>
    </div>
  );
}
