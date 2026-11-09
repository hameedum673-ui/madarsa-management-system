import { STATS } from "@/data/departments";
import { Icon } from "@/components/icons";

/**
 * ڈیش بورڈ کے چار اعدادوشمار۔
 * مرحلہ 4 سے «کل طلبہ» اور مرحلہ 5 سے «کل اساتذہ» اصل تعداد دکھاتے ہیں
 * (فعال)؛ باقی دو ابھی خالی حالت (صفر) ہیں — کوئی فرضی ڈیٹا نہیں۔
 * صفر اور تعداد اسی طرح اردو ہندسوں میں دکھائے جاتے ہیں جیسے اصل فائل میں تھا۔
 */
export default function StatsRow({
  studentsCount = 0,
  teachersCount = 0,
}: {
  studentsCount?: number;
  teachersCount?: number;
}) {
  const zero = (0).toLocaleString("ur-PK");
  return (
    <div className="stats">
      {STATS.map((s, index) => {
        const isStudents = index === 0;
        const isTeachers = index === 1;
        const value = isStudents
          ? studentsCount.toLocaleString("ur-PK")
          : isTeachers
            ? teachersCount.toLocaleString("ur-PK")
            : zero;
        const note =
          isStudents && studentsCount > 0
            ? "فعال طالبات"
            : isTeachers && teachersCount > 0
              ? "فعال اساتذہ"
              : s.note;
        return (
          <div className="stat" key={s.label}>
            <div className="sic">
              <Icon name={s.icon} />
            </div>
            <div>
              <div className="slabel">{s.label}</div>
              <div className="svalue">{value}</div>
              <div className="snote">{note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
