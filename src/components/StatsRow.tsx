import { STATS } from "@/data/departments";
import { Icon } from "@/components/icons";
import { numLocale, t, type Lang } from "@/i18n/dictionary";

/**
 * ڈیش بورڈ کے چار اعدادوشمار۔
 * مرحلہ 4 سے «کل طلبہ»، مرحلہ 5 سے «کل اساتذہ» اور مرحلہ 6 سے «آج کی حاضری»
 * اصل تعداد دکھاتے ہیں؛ مرحلہ 96 سے چوتھا خانہ «کل جماعتیں» ہے (بیلنس
 * اب ڈیش بورڈ پر نہیں — وہ رپورٹس والے صفحے پر ہے)۔ صفر اور تعداد اسی
 * طرح اردو ہندسوں میں دکھائے جاتے ہیں جیسے اصل فائل میں تھا۔
 */
export default function StatsRow({
  studentsCount = 0,
  teachersCount = 0,
  classesCount = 0,
  studentsBanin = 0,
  studentsBanat = 0,
  teachersBanin = 0,
  teachersBanat = 0,
  classesBanin = 0,
  classesBanat = 0,
  attendanceToday = null,
  // حصہ 4 — عملے کو صرف کھلے گروپ کے کارڈ دکھیں (پہلے سے سب true)
  showStudents = true,
  showTeachers = true,
  showClasses = true,
  showAttendance = true,
  lang = "ur",
}: {
  studentsCount?: number;
  teachersCount?: number;
  classesCount?: number;
  // مرحلہ 51 — بنین / بنات کی الگ گنتی
  studentsBanin?: number;
  studentsBanat?: number;
  teachersBanin?: number;
  teachersBanat?: number;
  classesBanin?: number;
  classesBanat?: number;
  attendanceToday?: { present: number; total: number; marked: number } | null;
  showStudents?: boolean;
  showTeachers?: boolean;
  showClasses?: boolean;
  showAttendance?: boolean;
  lang?: Lang;
}) {
  const locale = numLocale(lang);
  const zero = (0).toLocaleString(locale);
  // مرحلہ 102 — کارڈ کے نام چنی ہوئی زبان میں (STATS سے صرف آئیکن)
  const statKeys = [
    "stat.students",
    "stat.teachers",
    "stat.attendance",
    "stat.classes",
  ] as const;
  return (
    <div className="stats">
      {STATS.map((s, index) => {
        const isStudents = index === 0;
        const isTeachers = index === 1;
        const isAttendance = index === 2;
        const isClasses = index === 3;
        // حصہ 4 — بند گروپ کا کارڈ دکھائیں ہی نہیں
        if (isStudents && !showStudents) return null;
        if (isTeachers && !showTeachers) return null;
        if (isAttendance && !showAttendance) return null;
        if (isClasses && !showClasses) return null;
        const attendanceMarked =
          isAttendance && attendanceToday && attendanceToday.marked > 0;
        const value = isStudents
          ? studentsCount.toLocaleString(locale)
          : isTeachers
            ? teachersCount.toLocaleString(locale)
            : isAttendance && attendanceMarked
              ? attendanceToday.present.toLocaleString(locale)
              : isClasses
                ? classesCount.toLocaleString(locale)
                : zero;
        // مرحلہ 51 — بنین/بنات کی گنتی کا مجموعہ کل سے ملے تو الگ
        // گنتی دکھائیں؛ نہ ملے (SQL نہ چلی ہو) تو پرانا نوٹ دکھائیں۔
        // مرحلہ 102 — نوٹ بھی چنی ہوئی زبان میں۔
        const split = (banin: number, banat: number) =>
          `${t(lang, "word.banin")} ${banin.toLocaleString(locale)} · ${t(lang, "word.banat")} ${banat.toLocaleString(locale)}`;
        const studentsSplitOk =
          studentsCount > 0 &&
          studentsBanin + studentsBanat === studentsCount;
        const teachersSplitOk =
          teachersCount > 0 &&
          teachersBanin + teachersBanat === teachersCount;
        const classesSplitOk =
          classesCount > 0 &&
          classesBanin + classesBanat === classesCount;
        const note =
          isStudents && studentsSplitOk
            ? split(studentsBanin, studentsBanat)
            : isStudents && studentsCount > 0
              ? t(lang, "stat.note.students_active")
              : isTeachers && teachersSplitOk
                ? split(teachersBanin, teachersBanat)
                : isTeachers && teachersCount > 0
                  ? t(lang, "stat.note.teachers_active")
              : isAttendance && attendanceMarked
                ? t(lang, "stat.note.attendance_today", {
                    total: attendanceToday.total.toLocaleString(locale),
                    present: attendanceToday.present.toLocaleString(locale),
                  })
                : isClasses && classesSplitOk
                  ? split(classesBanin, classesBanat)
                  : isClasses && classesCount > 0
                    ? t(lang, "stat.note.classes_active")
                    : isAttendance
                      ? t(lang, "stat.note.attendance_empty")
                      : isClasses
                        ? t(lang, "stat.note.classes_empty")
                        : t(lang, "stat.note.empty");
        return (
          <div className="stat" key={s.label}>
            <div className="sic">
              <Icon name={s.icon} />
            </div>
            <div>
              <div className="slabel">{t(lang, statKeys[index])}</div>
              <div className="svalue">{value}</div>
              <div className="snote">{note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
