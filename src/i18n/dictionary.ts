/**
 * مرحلہ 102 — زبان کا ڈھانچہ (i18n)
 *
 * الفاظ کی فہرست: ہر لفظ کی اردو اور عربی۔ انگریزی (en) اس مرحلے میں
 * خالی ہے — انگریزی والے مرحلے میں بھرے گی؛ تب تک انگریزی کی کمی پر
 * اردو دکھے گی (t کا حفاظتی جال)۔
 *
 * دائرہ اس مرحلے کا: صرف ڈیش بورڈ کا خول (سرخی، گروپ، بٹن، اعداد والے
 * کارڈ، گھنٹی، مینیو) + پروفائل میں زبان والا حصہ + عام الفاظ۔
 * اندر والے صفحے (طلبہ، فیس، حاضری وغیرہ) ابھی اردو ہی رہیں گے — وہ
 * اگلے مرحلوں میں گروپ در گروپ عربی ہوں گے۔
 */

export type Lang = "ur" | "ar" | "en";

/** زبان کا انتخاب — ہر آپشن اپنی زبان میں لکھا ہے تاکہ اردو پڑھے بغیر
 * بھی پہچانا جا سکے۔ انگریزی اس مرحلے میں بند ہے ("جلد آ رہا ہے")۔ */
export const LANG_OPTIONS: { id: Lang; label: string; comingSoon: boolean }[] = [
  { id: "ur", label: "اردو", comingSoon: false },
  { id: "ar", label: "العربية", comingSoon: false },
  { id: "en", label: "English", comingSoon: true },
];

export function isLang(v: unknown): v is Lang {
  return v === "ur" || v === "ar" || v === "en";
}

/** اس مرحلے میں چنی جا سکنے والی زبانیں — انگریزی نہیں (بعد کا مرحلہ) */
export function isSelectableLang(v: unknown): v is "ur" | "ar" {
  return v === "ur" || v === "ar";
}

type Dict = Record<string, string>;

const ur: Dict = {
  "app.name": "جامعہ منیجمنٹ سسٹم",
  "app.dashboard": "مین ڈیش بورڈ",
  "app.sysname": "جامعہ منیجمنٹ سسٹم — مین ڈیش بورڈ",

  "group.edu": "تعلیمی شعبہ",
  "group.fin": "مالیاتی شعبہ",
  "group.admin": "انتظامی شعبہ",
  "group.other": "دیگر سہولیات",

  "module.students": "طلبہ کا ریکارڈ",
  "module.students.desc": "تمام طلبہ کی مکمل تفصیلات، رجسٹریشن نمبر اور سابقہ ریکارڈ یہاں محفوظ ہوگا۔",
  "module.admissions": "نئے داخلے",
  "module.admissions.desc": "نئے طلبہ کے داخلے، داخلہ فارم اور اندراج کا مکمل نظام یہاں ہوگا۔",
  "module.idcards": "طلبہ کے شناختی کارڈ",
  "module.idcards.desc": "طلبہ کے شناختی کارڈ کی تیاری اور پرنٹ کی سہولت یہاں فراہم کی جائے گی۔",
  "module.teachers": "اساتذہ کا ریکارڈ",
  "module.teachers.desc": "اساتذہ کی تفصیلات، تقرری اور تدریسی ذمہ داریوں کا ریکارڈ یہاں ہوگا۔",
  "module.staff": "عملے کا ریکارڈ",
  "module.staff.desc": "غیر تدریسی عملے کی تفصیلات اور ذمہ داریوں کا ریکارڈ یہاں ہوگا۔",
  "module.classes": "درجات اور جماعتیں",
  "module.classes.desc": "درجات، جماعتوں اور شعبہ جات (حفظ، ناظرہ، درسِ نظامی) کی ترتیب یہاں ہوگی۔",
  "module.att-students": "طلبہ کی حاضری",
  "module.att-students.desc": "طلبہ کی روزانہ حاضری اور حاضری رپورٹس کا نظام یہاں تیار ہوگا۔",
  "module.att-teachers": "اساتذہ کی حاضری",
  "module.att-teachers.desc": "اساتذہ کی حاضری اور تدریسی اوقات کا ریکارڈ یہاں ہوگا۔",
  "module.academic": "تعلیمی ریکارڈ",
  "module.academic.desc": "اسباق کی پیش رفت اور تعلیمی کارکردگی کا ریکارڈ یہاں محفوظ ہوگا۔",
  "module.library": "لائبریری",
  "module.library.desc": "مدرسے کی کتابوں کا ریکارڈ یہاں ہوگا۔",
  "module.exams": "امتحانات اور نتائج",
  "module.exams.desc": "امتحانات، نمبرات، درجات اور پوزیشنوں کا مکمل نظام یہاں ہوگا۔",
  "module.income": "آمدنی کا ریکارڈ",
  "module.income.desc": "مدرسے کی تمام آمدنی اور رسیدوں کا ریکارڈ یہاں محفوظ ہوگا۔",
  "module.expenses": "اخراجات کا ریکارڈ",
  "module.expenses.desc": "تمام اخراجات کی تفصیل اور واؤچرز کا ریکارڈ یہاں ہوگا۔",
  "module.salaries": "تنخواہیں",
  "module.salaries.desc": "اساتذہ اور عملے کی ماہانہ تنخواہوں کا خفیہ ریکارڈ یہاں ہوگا — صرف ایڈمن کے لیے۔",
  "module.monthly": "ماہانہ حسابات",
  "module.monthly.desc": "ہر مہینے کی آمدنی و اخراجات کا خلاصہ اور بندش یہاں دیکھی جا سکے گی۔",
  "module.yearly": "سالانہ حسابات",
  "module.yearly.desc": "سال بھر کے مالی حسابات اور سالانہ خلاصہ یہاں تیار ہوگا۔",
  "module.zakat": "زکوٰۃ",
  "module.zakat.desc": "زکوٰۃ کی وصولی اور مستحقین تک تقسیم کا الگ ریکارڈ یہاں ہوگا۔",
  "module.ushr": "عشر",
  "module.ushr.desc": "عشر کی وصولی اور مستحقین تک تقسیم کا الگ ریکارڈ یہاں ہوگا۔",
  "module.donations": "صدقات اور عطیات",
  "module.donations.desc": "صدقات، عطیات اور عطیہ دہندگان کا ریکارڈ یہاں محفوظ ہوگا۔",
  "module.welfare": "وظائف اور مالی معاونت",
  "module.welfare.desc": "مستحق طلبہ کے وظائف اور مالی معاونت کا ریکارڈ یہاں ہوگا۔",
  "module.student-exp": "طلبہ کے اخراجات",
  "module.student-exp.desc": "فی طالبہ اخراجات اور ان کی تفصیل کا حساب یہاں ہوگا۔",
  "module.fin-reports": "مالیاتی رپورٹس",
  "module.fin-reports.desc": "آمدنی، اخراجات اور بیلنس کی مکمل مالیاتی رپورٹس یہاں تیار ہوں گی۔",
  "module.general": "مدرسے کا عمومی ریکارڈ",
  "module.general.desc": "مدرسے کی بنیادی معلومات اور عمومی دفتری ریکارڈ یہاں ہوگا۔",
  "module.users": "صارفین اور اکاؤنٹس",
  "module.users.desc": "نظام استعمال کرنے والے تمام صارفین کے اکاؤنٹس کا انتظام یہاں ہوگا۔",
  "module.permissions": "اختیارات اور اجازتیں",
  "module.permissions.desc": "ہر صارف کے اختیارات اور شعبہ جات تک رسائی کی اجازتیں یہاں مقرر ہوں گی۔",
  "module.notices": "اطلاعات اور اعلانات",
  "module.notices.desc": "مدرسے کی اطلاعات، اعلانات اور تعطیلات کا ریکارڈ یہاں ہوگا۔",
  "module.documents": "دستاویزات",
  "module.documents.desc": "سرکاری دستاویزات اور فائلوں کا محفوظ ریکارڈ یہاں ہوگا۔",
  "module.reports": "رپورٹس",
  "module.reports.desc": "مختلف شعبوں کی مجموعی رپورٹس یہاں تیار اور پرنٹ کی جا سکیں گی۔",
  "module.backup": "بیک اپ",
  "module.backup.desc": "تمام ڈیٹا کا محفوظ بیک اپ اور بحالی کی سہولت یہاں ہوگی۔",
  "module.settings": "نظام کی ترتیبات",
  "module.settings.desc": "مدرسے کا نام، لوگو اور نظام کی عمومی ترتیبات یہاں بدلی جا سکیں گی۔",

  // ملے ہوئے بٹن (حب) — ڈیش بورڈ پر یہ نام دکھتے ہیں
  "hub.students_idcards": "طلبہ کے داخلے اور ریکارڈ",
  "hub.admissions_students": "داخلے اور طلبہ",
  "hub.attendance": "حاضری",
  "hub.welfare": "وظائف اور طلبہ کے اخراجات",
  "hub.users": "صارفین اور اختیارات",
  "hub.reports": "رپورٹس",

  "stat.students": "کل طلبہ",
  "stat.teachers": "کل اساتذہ",
  "stat.attendance": "آج کی حاضری",
  "stat.classes": "کل جماعتیں",
  "stat.note.empty": "ریکارڈ ابھی خالی ہے",
  "stat.note.attendance_empty": "حاضری ابھی درج نہیں",
  "stat.note.classes_empty": "جماعت ابھی نہیں بنی",
  "stat.note.students_active": "فعال طالبات",
  "stat.note.teachers_active": "فعال اساتذہ",
  "stat.note.classes_active": "فعال جماعتیں",
  "stat.note.attendance_today": "آج {total} میں سے {present} حاضر",
  "word.banin": "بنین",
  "word.banat": "بنات",

  "topbar.notifications": "اطلاعات",
  "topbar.no_notices": "اس وقت کوئی نئی اطلاع موجود نہیں ہے۔",
  "topbar.all_notices": "تمام اطلاعات دیکھیں",
  "topbar.my_profile": "میرا پروفائل",
  "topbar.users": "صارفین اور اکاؤنٹس",
  "topbar.settings": "نظام کی ترتیبات",
  "topbar.language": "زبان",
  "topbar.logout": "لاگ آؤٹ",
  "topbar.user_menu": "صارف کا مینو",
  "topbar.guest_banner": "ڈیمو — باقی وقت: {time} — وقت ختم ہونے پر ڈیمو خودبخود بند ہو جائے گا۔",
  "topbar.backup_none": "ابھی تک بیک اپ ڈاؤن لوڈ نہیں ہوا — ڈیٹا محفوظ رکھنے کے لیے بیک اپ ڈاؤن لوڈ کر لیں۔",
  "topbar.backup_old": "آخری بیک اپ کو {days} دن ہو گئے ہیں — نیا بیک اپ ڈاؤن لوڈ کر لیں۔",
  "topbar.backup_open": "بیک اپ صفحہ کھولیں",
  "notice.kind.notice": "اطلاع",
  "notice.kind.announcement": "اعلان",
  "notice.kind.holiday": "تعطیل",

  "profile.language": "زبان",
  "profile.language_note": "اپنی زبان چنیں — ڈیش بورڈ اسی زبان میں دکھے گا۔",
  "profile.language_saved": "زبان محفوظ ہو گئی۔",
  "profile.language_error": "زبان محفوظ نہیں ہو سکی۔ دوبارہ کوشش کریں۔",

  "common.save": "محفوظ کریں",
  "common.back": "واپس",
  "common.search": "تلاش",
  "common.new": "نیا",
  "common.edit": "ترمیم",
  "common.list": "فہرست",
  "common.wait": "براہِ کرم انتظار کریں…",
  "common.coming_soon": "جلد آ رہا ہے",
  "common.hour": "گھنٹہ",
  "common.minute": "منٹ",
};

const ar: Dict = {
  "app.name": "نظام إدارة الجامعة",
  "app.dashboard": "لوحة التحكم",
  "app.sysname": "نظام إدارة الجامعة — لوحة التحكم",

  "group.edu": "القسم التعليمي",
  "group.fin": "القسم المالي",
  "group.admin": "القسم الإداري",
  "group.other": "خدمات أخرى",

  "module.students": "سجل الطلاب",
  "module.students.desc": "تُحفظ هنا جميع تفاصيل الطلاب وأرقام تسجيلهم وسجلاتهم السابقة.",
  "module.admissions": "القبول الجديد",
  "module.admissions.desc": "نظام كامل لقبول الطلاب الجدد واستمارات القبول والتسجيل.",
  "module.idcards": "بطاقات هوية الطلاب",
  "module.idcards.desc": "إعداد بطاقات هوية الطلاب وطباعتها.",
  "module.teachers": "سجل المعلمين",
  "module.teachers.desc": "تفاصيل المعلمين وتعيينهم ومسؤولياتهم التدريسية.",
  "module.staff": "سجل الموظفين",
  "module.staff.desc": "تفاصيل الموظفين غير التدريسيين ومسؤولياتهم.",
  "module.classes": "الصفوف والشعب",
  "module.classes.desc": "ترتيب الصفوف والشعب والأقسام (الحفظ، الناظرة، الدرس النظامي).",
  "module.att-students": "حضور الطلاب",
  "module.att-students.desc": "نظام الحضور اليومي للطلاب وتقارير الحضور.",
  "module.att-teachers": "حضور المعلمين",
  "module.att-teachers.desc": "سجل حضور المعلمين وأوقات التدريس.",
  "module.academic": "السجل التعليمي",
  "module.academic.desc": "سجل تقدم الدروس والأداء التعليمي.",
  "module.library": "المكتبة",
  "module.library.desc": "سجل كتب المدرسة.",
  "module.exams": "الامتحانات والنتائج",
  "module.exams.desc": "نظام كامل للامتحانات والدرجات والتقديرات والترتيب.",
  "module.income": "سجل الإيرادات",
  "module.income.desc": "سجل جميع إيرادات المدرسة وإيصالاتها.",
  "module.expenses": "سجل المصروفات",
  "module.expenses.desc": "تفاصيل جميع المصروفات وسنداتها.",
  "module.salaries": "الرواتب",
  "module.salaries.desc": "سجل سري للرواتب الشهرية للمعلمين والموظفين — للإدارة فقط.",
  "module.monthly": "الحسابات الشهرية",
  "module.monthly.desc": "خلاصة الإيرادات والمصروفات الشهرية وإغلاق الشهر.",
  "module.yearly": "الحسابات السنوية",
  "module.yearly.desc": "الحسابات السنوية وخلاصة السنة.",
  "module.zakat": "الزكاة",
  "module.zakat.desc": "سجل مستقل لتحصيل الزكاة وتوزيعها على المستحقين.",
  "module.ushr": "العشر",
  "module.ushr.desc": "سجل مستقل لتحصيل العشر وتوزيعه على المستحقين.",
  "module.donations": "الصدقات والتبرعات",
  "module.donations.desc": "سجل الصدقات والتبرعات والمتبرعين.",
  "module.welfare": "المنح والمساعدات المالية",
  "module.welfare.desc": "سجل منح الطلاب المستحقين والمساعدات المالية.",
  "module.student-exp": "مصروفات الطلاب",
  "module.student-exp.desc": "حساب مصروفات كل طالبة وتفاصيلها.",
  "module.fin-reports": "التقارير المالية",
  "module.fin-reports.desc": "تقارير مالية كاملة للإيرادات والمصروفات والرصيد.",
  "module.general": "السجل العام للمدرسة",
  "module.general.desc": "المعلومات الأساسية للمدرسة والسجل المكتبي العام.",
  "module.users": "المستخدمون والحسابات",
  "module.users.desc": "إدارة حسابات جميع مستخدمي النظام.",
  "module.permissions": "الصلاحيات والأذونات",
  "module.permissions.desc": "تحديد صلاحيات كل مستخدم والوصول إلى الأقسام.",
  "module.notices": "الإشعارات والإعلانات",
  "module.notices.desc": "سجل إشعارات المدرسة وإعلاناتها وعطلها.",
  "module.documents": "المستندات",
  "module.documents.desc": "سجل آمن للمستندات والملفات الرسمية.",
  "module.reports": "التقارير",
  "module.reports.desc": "إعداد التقارير الإجمالية لمختلف الأقسام وطباعتها.",
  "module.backup": "النسخ الاحتياطي",
  "module.backup.desc": "نسخ جميع البيانات احتياطيًا واستعادتها.",
  "module.settings": "إعدادات النظام",
  "module.settings.desc": "تغيير اسم المدرسة وشعارها والإعدادات العامة للنظام.",

  "hub.students_idcards": "قبول الطلاب وسجلاتهم",
  "hub.admissions_students": "القبول والطلاب",
  "hub.attendance": "الحضور",
  "hub.welfare": "المنح ومصروفات الطلاب",
  "hub.users": "المستخدمون والصلاحيات",
  "hub.reports": "التقارير",

  "stat.students": "مجموع الطلاب",
  "stat.teachers": "مجموع المعلمين",
  "stat.attendance": "حضور اليوم",
  "stat.classes": "مجموع الشعب",
  "stat.note.empty": "لا يوجد سجل بعد",
  "stat.note.attendance_empty": "لم يُسجَّل الحضور بعد",
  "stat.note.classes_empty": "لم تُنشأ شعبة بعد",
  "stat.note.students_active": "طالبات نشطات",
  "stat.note.teachers_active": "معلمون نشطون",
  "stat.note.classes_active": "شعب نشطة",
  "stat.note.attendance_today": "اليوم حضر {present} من {total}",
  "word.banin": "بنين",
  "word.banat": "بنات",

  "topbar.notifications": "الإشعارات",
  "topbar.no_notices": "لا توجد إشعارات جديدة حاليًا.",
  "topbar.all_notices": "عرض كل الإشعارات",
  "topbar.my_profile": "ملفي الشخصي",
  "topbar.users": "المستخدمون والحسابات",
  "topbar.settings": "إعدادات النظام",
  "topbar.language": "اللغة",
  "topbar.logout": "تسجيل الخروج",
  "topbar.user_menu": "قائمة المستخدم",
  "topbar.guest_banner": "عرض تجريبي — الوقت المتبقي: {time} — سيُغلق العرض تلقائيًا عند انتهاء الوقت.",
  "topbar.backup_none": "لم يُنزَّل أي نسخة احتياطية بعد — نزِّل نسخة احتياطية لحفظ البيانات.",
  "topbar.backup_old": "مضى {days} يومًا على آخر نسخة احتياطية — نزِّل نسخة جديدة.",
  "topbar.backup_open": "افتح صفحة النسخ الاحتياطي",
  "notice.kind.notice": "إشعار",
  "notice.kind.announcement": "إعلان",
  "notice.kind.holiday": "عطلة",

  "profile.language": "اللغة",
  "profile.language_note": "اختر لغتك — ستظهر لوحة التحكم بهذه اللغة.",
  "profile.language_saved": "تم حفظ اللغة.",
  "profile.language_error": "تعذّر حفظ اللغة. حاول مرة أخرى.",

  "common.save": "حفظ",
  "common.back": "رجوع",
  "common.search": "بحث",
  "common.new": "جديد",
  "common.edit": "تعديل",
  "common.list": "قائمة",
  "common.wait": "يرجى الانتظار…",
  "common.coming_soon": "قريبًا",
  "common.hour": "ساعة",
  "common.minute": "دقيقة",
};

/** انگریزی اس مرحلے میں خالی ہے — t کی کمی پر اردو دکھے گی۔ */
const en: Dict = {};

const DICTS: Record<Lang, Dict> = { ur, ar, en };

/**
 * لفظ نکالنا — پہلے چنی ہوئی زبان، پھر اردو (حفاظتی جال)، پھر خود کلید۔
 * {نام} والے خانے vars سے بھرے جاتے ہیں۔
 */
export function t(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let out = DICTS[lang]?.[key] ?? DICTS.ur[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

/** اعداد کی شکل — اردو اور عربی دونوں میں مشرقی ہندسے (جیسے پہلے تھے) */
export function numLocale(lang: Lang): string {
  return lang === "ar" ? "ar-EG" : "ur-PK";
}
