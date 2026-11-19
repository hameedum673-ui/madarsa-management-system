-- ============================================================
-- امتحان + تعلیمی سال — exams.academic_year_id
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 056 چل چکی ہو، پھر یہ فائل چلائیں۔
--
-- ہر امتحان اپنے تعلیمی سال سے جڑ جاتا ہے، تاکہ سالوں بعد بھی
-- سال چن کر پرانا نتیجہ فوراً مل سکے۔ سال امتحان کی تاریخ سے
-- نکلتا ہے (src/lib/academicYears.ts میں deriveAcademicYearId):
--   * تاریخ کسی سال کے اندر (start_date..end_date) → وہی سال
--   * تاریخ شعبان–رمضان کے وقفے میں (ایک سال ختم، اگلا ابھی
--     شروع نہیں ہوا) → آنے والا سال (وقفے میں آنے والا سال ہی
--     موجودہ مانا جاتا ہے — وہی اصول جو سال بناتے وقت طے ہوا)
--   * تاریخ کسی سال سے نہیں ملتی → خالی (NULL) — امتحان "سب سال"
--     میں ہی دکھے گا
-- ============================================================

-- 1) کالم — خالی ہو سکتا ہے (پرانے امتحان جن کی تاریخ کسی سال میں
--    نہ آئے، وہ خالی رہیں گے)
alter table public.exams
  add column if not exists academic_year_id uuid
  references public.academic_years (id);

-- 2) انڈیکس — سال کے فلٹر کے لیے
create index if not exists exams_academic_year_id_idx
  on public.exams (madrasa_id, academic_year_id);

-- 3) پرانے امتحانات کی بھری — ہر مدرسے کے اپنے سالوں سے، ہر
--    امتحان کی اپنی تاریخ کے حساب سے
-- 3ا) تاریخ جو کسی سال کے اندر آتی ہے → وہی سال
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

-- 3ب) تاریخ جو شعبان–رمضان کے وقفے میں ہے (کوئی سال ختم ہو چکا،
--    اگلا ابھی شروع نہیں ہوا) → آنے والا سال۔ شرط "کوئی سال پہلے
--    ختم ہو چکا ہو" اس لیے ہے کہ پہلے سال سے بھی پرانی تاریخ والا
--    امتحان غلطی سے پہلے سال کا نہ بن جائے — وہ خالی رہے گا۔
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
