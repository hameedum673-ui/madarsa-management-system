-- ============================================================
-- مرحلہ 70 — امتحان کی قسم (سہ ماہی / شش ماہی / سالانہ / دیگر)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- نیا کالم exam_type — خالی (NULL) رہ سکتا ہے تاکہ پرانے امتحانات
-- پر کوئی اثر نہ پڑے (ان کی قسم "—" دکھائے گی)۔
-- ============================================================

alter table public.exams
  add column if not exists exam_type text
  check (exam_type in ('quarterly', 'half_yearly', 'annual', 'other'));
