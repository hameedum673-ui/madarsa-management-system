-- ============================================================
-- امتحان + سال — دوبارہ بھری (جب نیا/پرانا سال بعد میں بنے)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- کب چلائیں: جب کوئی سال (مثلاً پرانا سال 1446ھ) migration-057
--   کے بعد بنایا گیا ہو — وہ امتحان جن کا سال اس وقت بنا ہی
--   نہیں تھا، اب اپنے سال سے جڑ جائیں گے۔
-- محفوظ ہے: صرف وہ امتحان بدلتے ہیں جن کا سال ابھی خالی ہے؛
--   جن کا سال لگ چکا، وہ نہیں چھیڑے جاتے۔ دوبارہ چلانا بھی
--   محفوظ ہے۔
-- اصول (migration-057 جیسا، src/lib/academicYears.ts میں
--   deriveAcademicYearId جیسا):
--   * تاریخ کسی سال کے اندر (start_date..end_date) → وہی سال
--   * تاریخ شعبان–رمضان کے وقفے میں (ایک سال ختم، اگلا ابھی
--     شروع نہیں ہوا) → آنے والا سال
--   * تاریخ کسی سال سے نہیں ملتی → خالی رہے گا
-- ============================================================

-- 1) تاریخ جو کسی سال کے اندر آتی ہے → وہی سال
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

-- 2) تاریخ جو شعبان–رمضان کے وقفے میں ہے → آنے والا سال
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
