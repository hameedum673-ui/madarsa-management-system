-- ============================================================
-- سال کا نام دوہرا + یکم شوال سے شروع (1447/48ھ)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- فیصلہ (2026-11-20): مدرسے کا سال یکم شوال سے شروع ہوتا ہے
--   اور رمضان کے آخر میں ختم ہوتا ہے؛ سال کا نام دوہرا لکھا
--   جاتا ہے — پہلا داخلے کا سال، دوسرا اختتام کا سال
--   (جیسے 1447/48ھ: داخلے شوال 1447 میں، امتحان رجب 1448 میں)۔
-- یہ فائل: (1) دونوں سالوں کے نام دوہرے کرتی ہے، (2) شروع کی
--   تاریخیں یکم شوال پر لاتی ہے، (3) ختم کی تاریخیں رمضان کے
--   آخر پر لاتی ہیں (شروع + 353 دن)۔ دونوں سال آپس میں جڑے
--   ہوئے ہیں — کوئی خالی وقفہ نہیں، کوئی اوورلیپ نہیں۔
-- محفوظ ہے: صرف وہی دو سال بدلتے ہیں جن کے نام + شروع کی
--   تاریخیں نیچے لکھی ہیں (اس مدرسے کے)؛ اندراج، امتحان یا
--   کوئی اور ریکارڈ نہیں چھوا جاتا۔ امتحانوں کی دوبارہ بھری
--   صرف ان امتحانوں کو جوڑتی ہے جن کا سال ابھی خالی ہے۔
--   دوبارہ چلانا بھی محفوظ ہے (نام بدل جانے کے بعد شرط نہیں ملتی)۔
-- ============================================================

-- 1) 1447ھ → 1447/48ھ (یکم شوال 1447 = 20-03-2026؛ رمضان 1448 کا آخر = 08-03-2027)
update public.academic_years
set label = '1447/48ھ',
    start_date = '2026-03-20',
    end_date = '2027-03-08'
where label like '1447%'
  and start_date = '2026-03-30';

-- 2) 1446ھ → 1446/47ھ (یکم شوال 1446 = 31-03-2025؛ رمضان 1447 کا آخر = 19-03-2026)
update public.academic_years
set label = '1446/47ھ',
    start_date = '2025-03-31',
    end_date = '2026-03-19'
where label like '1446%'
  and start_date = '2025-04-10';

-- 3) تاریخ جو کسی سال کے اندر آتی ہے → وہی سال (صرف جن کا سال خالی ہے)
update public.exams e
set academic_year_id = (
  select y.id
  from public.academic_years y
  where y.madrasa_id = e.madrasa_id
    and e.exam_date >= y.start_date
    and e.exam_date <= y.end_date
  order by y.start_date desc
  limit 1
)
where e.academic_year_id is null;

-- 4) تاریخ جو شعبان–رمضان کے وقفے میں ہے → آنے والا سال (صرف جن کا سال خالی ہے)
update public.exams e
set academic_year_id = (
  select y.id
  from public.academic_years y
  where y.madrasa_id = e.madrasa_id
    and y.start_date > e.exam_date
  order by y.start_date asc
  limit 1
)
where e.academic_year_id is null
  and exists (
    select 1
    from public.academic_years y2
    where y2.madrasa_id = e.madrasa_id
      and y2.end_date < e.exam_date
  );
