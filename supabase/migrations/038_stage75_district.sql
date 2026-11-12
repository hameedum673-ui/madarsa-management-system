-- مرحلہ 75 — طالبہ کا ضلع (نتیجہ کارڈ پر)
-- خالی رہ سکتا ہے (null) — پرانی طالبات کا ضلع خالی رہے گا۔
alter table public.students
  add column if not exists district text;
