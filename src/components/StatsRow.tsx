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
  studentsBanin = 0,
  studentsBanat = 0,
  teachersBanin = 0,
  teachersBanat = 0,
  attendanceToday = null,
  balance = null,
  // حصہ 4 — عملے کو صرف کھلے گروپ کے کارڈ دکھیں (پہلے سے سب true)
  showStudents = true,
  showTeachers = true,
  showAttendance = true,
  showBalance = true,
}: {
  studentsCount?: number;
  teachersCount?: number;
  // مرحلہ 51 — بنین / بنات کی الگ گنتی
  studentsBanin?: number;
  studentsBanat?: number;
  teachersBanin?: number;
  teachersBanat?: number;
  attendanceToday?: { present: number; total: number; marked: number } | null;
  balance?: { value: number; hasPayments: boolean } | null;
  showStudents?: boolean;
  showTeachers?: boolean;
  showAttendance?: boolean;
  showBalance?: boolean;
}) {
  const zero = (0).toLocaleString("ur-PK");
  return (
    <div className="stats">
      {STATS.map((s, index) => {
        const isStudents = index === 0;
        const isTeachers = index === 1;
        const isAttendance = index === 2;
        const isBalance = index === 3;
        // حصہ 4 — بند گروپ کا کارڈ دکھائیں ہی نہیں
        if (isStudents && !showStudents) return null;
        if (isTeachers && !showTeachers) return null;
        if (isAttendance && !showAttendance) return null;
        if (isBalance && !showBalance) return null;
        const attendanceMarked =
          isAttendance && attendanceToday && attendanceToday.marked > 0;
        const balanceShown = isBalance && balance && balance.hasPayments;
        const value = isStudents
          ? studentsCount.toLocaleString("ur-PK")
          : isTeachers
            ? teachersCount.toLocaleString("ur-PK")
            : isAttendance && attendanceMarked
              ? attendanceToday.present.toLocaleString("ur-PK")
              : balanceShown
                ? balance.value.toLocaleString("ur-PK")
                : zero;
        // مرحلہ 51 — بنین/بنات کی گنتی کا مجموعہ کل سے ملے تو الگ
        // گنتی دکھائیں؛ نہ ملے (SQL نہ چلی ہو) تو پرانا نوٹ دکھائیں۔
        const studentsSplitOk =
          studentsCount > 0 &&
          studentsBanin + studentsBanat === studentsCount;
        const teachersSplitOk =
          teachersCount > 0 &&
          teachersBanin + teachersBanat === teachersCount;
        const note =
          isStudents && studentsSplitOk
            ? `بنین ${studentsBanin.toLocaleString("ur-PK")} · بنات ${studentsBanat.toLocaleString("ur-PK")}`
            : isStudents && studentsCount > 0
              ? "فعال طالبات"
              : isTeachers && teachersSplitOk
                ? `بنین ${teachersBanin.toLocaleString("ur-PK")} · بنات ${teachersBanat.toLocaleString("ur-PK")}`
                : isTeachers && teachersCount > 0
                  ? "فعال اساتذہ"
              : isAttendance && attendanceMarked
                ? `آج ${attendanceToday.total.toLocaleString("ur-PK")} میں سے ${attendanceToday.present.toLocaleString("ur-PK")} حاضر`
                : balanceShown
                  ? "فیس + عطیات + زکوٰۃ + عشر − اخراجات"
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
