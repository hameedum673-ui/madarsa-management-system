-- ============================================================
-- جماعت کے مضامین کا سانچہ — classes.subjects
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
--
-- ہر جماعت کے مضامین ایک بار طے ہوں گے، تاکہ نیا امتحان بناتے
-- وقت جماعت چنتے ہی مضامین خود بھر جائیں — ہر بار کوما لگا کر
-- لکھنے نہ پڑیں۔ امتحان کے مضامین اس کی اپنی نقل رہتے ہیں؛
-- جماعت کے مضامین بدلنے سے پرانے امتحان نہیں بدلتے۔
--
-- پرانی بھری: ہر جماعت کے مضامین اسی جماعت کے آخری امتحان سے
-- (وہی مدرسہ + وہی جماعت کا نام + وہی شعبہ + وہی حصہ، تازہ ترین
-- تاریخ والا امتحان)۔ جس جماعت کا کوئی امتحان نہیں، اس کے مضامین
-- خالی رہیں گے — صارف جماعت کے فارم میں ایک بار لکھے گا۔
-- محفوظ ہے: صرف جماعتوں کی میز میں ایک کالم بڑھتا ہے؛ کوئی
-- ریکارڈ حذف نہیں ہوتا؛ دوبارہ چلانا بھی محفوظ ہے۔
-- ============================================================

-- 1) کالم — خالی ہو سکتا ہے (پہلے سے خالی فہرست)
alter table public.classes
  add column if not exists subjects text[] default '{}';

-- 2) پرانی بھری — ہر جماعت کے آخری امتحان کے مضامین
update public.classes c
set subjects = (
  select e.subjects
  from public.exams e
  where e.madrasa_id = c.madrasa_id
    and e.class_name = c.name
    and e.department = c.department
    and e.section = c.section
    and e.subjects is not null
    and cardinality(e.subjects) > 0
  order by e.exam_date desc, e.created_at desc
  limit 1
)
where exists (
  select 1
  from public.exams e2
  where e2.madrasa_id = c.madrasa_id
    and e2.class_name = c.name
    and e2.department = c.department
    and e2.section = c.section
    and e2.subjects is not null
    and cardinality(e2.subjects) > 0
);
