import BackButton from "@/components/BackButton";
import { Icon } from "@/components/icons";
import type { Department } from "@/lib/types";

/**
 * شعبے کا بنیادی صفحہ — فی الحال صرف «زیرِ تعمیر» حالت اور
 * ڈیش بورڈ پر واپس آنے کا بٹن۔ اصل نظام اگلے مرحلوں میں، منظوری کے بعد بنے گا۔
 * (مرحلہ 86: بنے ہوئے صفحے — جیسے پروفائل — کے لیے hideUnderConstruction
 * سے وہ سطر چھپائی جا سکتی ہے؛ [slug] والا صفحہ اسے ویسے ہی دکھاتا ہے۔)
 */
export default function ModuleCard({
  department,
  extra,
  hideUnderConstruction,
}: {
  department: Department;
  extra?: React.ReactNode;
  hideUnderConstruction?: boolean;
}) {
  return (
    <div className="module-view open">
      <div className="mod-card">
        <div className="back-arrow-row">
          <BackButton />
        </div>
        <div className="m-ic">
          <Icon name={department.icon} />
        </div>
        <div className="m-group">{department.group}</div>
        <h2>{department.label}</h2>
        <p className="m-desc">{department.desc}</p>
        {extra ? <div>{extra}</div> : null}
        {hideUnderConstruction ? null : (
          <div>
            <span className="m-state">یہ شعبہ زیرِ تعمیر ہے — اگلے مرحلے میں مکمل تیار کیا جائے گا</span>
          </div>
        )}
      </div>
    </div>
  );
}
