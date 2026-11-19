-- ============================================================
-- سال کی تاریخ کی درستگی — 1446ھ (غلط سال 2026 لکھا گیا تھا)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- کیا ہوا تھا: پرانا سال 1446ھ بناتے وقت شروع کی تاریخ میں
--   2025 کے بجائے 2026 لکھ دیا گیا تھا، اس لیے وہ سال
--   2026-04-10 سے شروع ہو گیا — اور 2025 کے امتحان + جنوری
--   2026 کا امتحان اس سال کی حد میں نہیں آتے تھے، اس لیے
--   دوبارہ بھری (058) انہیں کسی سال سے نہ جوڑ سکی۔
-- یہ فائل: (1) اس غلط سال کی تاریخ درست کرتی ہے
--   (10-04-2025 سے 30-03-2026 تک — 354 دن)، (2) پھر ان
--   امتحانوں کو دوبارہ ان کے سال سے جوڑتی ہے جن کا سال خالی ہے۔
-- محفوظ ہے: صرف وہ سال بدلتا ہے جس کا نام 1446 سے شروع ہو
--   اور جس کی شروع کی تاریخ 2026 میں ہو (غلط والا)؛ جن کا سال
--   لگ چکا، وہ امتحان نہیں چھیڑے جاتے۔ دوبارہ چلانا بھی محفوظ ہے۔
-- ============================================================

-- 1) غلط سال کی تاریخ درست کریں
update public.academic_years
set start_date = '2025-04-10',
    end_date = '2026-03-30'
where label like '1446%'
  and start_date >= '2026-01-01'
  and start_date < '2027-01-01';

-- 2) تاریخ جو کسی سال کے اندر آتی ہے → وہی سال
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

-- 3) تاریخ جو شعبان–رمضان کے وقفے میں ہے → آنے والا سال
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
