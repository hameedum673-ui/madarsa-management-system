import Link from "next/link";
import { BACK_ARROW_SVG, Icon } from "@/components/icons";
import type { Department } from "@/lib/types";

/**
 * شعبے کا بنیادی صفحہ — فی الحال صرف «زیرِ تعمیر» حالت اور
 * ڈیش بورڈ پر واپس آنے کا بٹن۔ اصل نظام اگلے مرحلوں میں، منظوری کے بعد بنے گا۔
 */
export default function ModuleCard({
  department,
  extra,
}: {
  department: Department;
  extra?: React.ReactNode;
}) {
  return (
    <div className="module-view open">
      <div className="mod-card">
        <div className="m-ic">
          <Icon name={department.icon} />
        </div>
        <div className="m-group">{department.group}</div>
        <h2>{department.label}</h2>
        <p className="m-desc">{department.desc}</p>
        {extra ? <div>{extra}</div> : null}
        <div>
          <span className="m-state">یہ شعبہ زیرِ تعمیر ہے — اگلے مرحلے میں مکمل تیار کیا جائے گا</span>
        </div>
        <Link className="back-btn" href="/">
          <span dangerouslySetInnerHTML={{ __html: BACK_ARROW_SVG }} />
          واپس مین ڈیش بورڈ
        </Link>
      </div>
    </div>
  );
}
