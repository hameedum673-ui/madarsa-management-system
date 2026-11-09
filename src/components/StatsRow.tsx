import { STATS } from "@/data/departments";
import { Icon } from "@/components/icons";

/**
 * ڈیش بورڈ کے چار اعدادوشمار۔
 * مرحلہ 4 سے «کل طلبہ»، مرحلہ 5 سے «کل اساتذہ» اور مرحلہ 6 سے «آج کی حاضری»
 * اصل تعداد دکھاتے ہیں؛ باقی ایک ابھی خالی حالت (صفر) ہے — کوئی فرضی ڈیٹا نہیں۔
 * صفر اور تعداد اسی طرح اردو ہندسوں میں دکھائے جاتے ہیں جیسے اصل فائل میں تھا۔
 */
export default function StatsRow({
  studentsCount = 0,
  teachersCount = 0,
  attendanceToday = null,
}: {
  studentsCount?: number;
  teachersCount?: number;
  attendanceToday?: { present: number; total: number; marked: number } | null;
}) {
  const zero = (0).toLocaleString("ur-PK");
  return (
    <div className="stats">
      {STATS.map((s, index) => {
        const isStudents = index === 0;
        const isTeachers = index === 1;
        const isAttendance = index === 2;
        const attendanceMarked =
          isAttendance && attendanceToday && attendanceToday.marked > 0;
        const value = isStudents
          ? studentsCount.toLocaleString("ur-PK")
          : isTeachers
            ? teachersCount.toLocaleString("ur-PK")
            : isAttendance && attendanceMarked
              ? attendanceToday.present.toLocaleString("ur-PK")
              : zero;
        const note =
          isStudents && studentsCount > 0
            ? "فعال طالبات"
            : isTeachers && teachersCount > 0
              ? "فعال اساتذہ"
              : isAttendance && attendanceMarked
                ? `آج ${attendanceToday.total.toLocaleString("ur-PK")} میں سے ${attendanceToday.present.toLocaleString("ur-PK")} حاضر`
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
