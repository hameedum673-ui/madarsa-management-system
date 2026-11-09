import { STATS } from "@/data/departments";
import { Icon } from "@/components/icons";

/**
 * ڈیش بورڈ کے چار اعدادوشمار — خالی حالت (صفر)، کوئی فرضی ڈیٹا نہیں۔
 * صفر اسی طرح اردو ہندسوں میں دکھایا جاتا ہے جیسے اصل فائل میں تھا۔
 */
export default function StatsRow() {
  const zero = (0).toLocaleString("ur-PK");
  return (
    <div className="stats">
      {STATS.map((s) => (
        <div className="stat" key={s.label}>
          <div className="sic">
            <Icon name={s.icon} />
          </div>
          <div>
            <div className="slabel">{s.label}</div>
            <div className="svalue">{zero}</div>
            <div className="snote">{s.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
