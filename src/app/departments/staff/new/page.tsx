/**
 * مرحلہ 13 — نیا عملہ شامل کرنے کا صفحہ
 */
import BackButton from "@/components/BackButton";
import StaffForm from "@/app/departments/staff/StaffForm";
import { addStaff } from "@/app/departments/staff/actions";
import { getMyLanguage } from "@/lib/language";
import { t } from "@/i18n/dictionary";

export default async function NewStaffPage() {
  const lang = await getMyLanguage();
  return (
    <div className="module-view open">
      <div className="page-card">
        <div className="page-head">
          <BackButton href="/departments/staff" />
          <h2>{t(lang, "staff.new_title")}</h2>
        </div>
        <StaffForm
          action={addStaff}
          submitLabel={t(lang, "common.save")}
          cancelHref="/departments/staff"
          lang={lang}
        />
      </div>
    </div>
  );
}
