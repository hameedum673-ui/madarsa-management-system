-- 065 — وظائف + طلبہ کے اخراجات کو اخراجات سے جوڑنا
-- تنخواہوں والا طریقہ: نیا اندراج ساتھ ہی اخراجات میں جڑی ہوئی V- رسید بناتا ہے،
-- تاکہ بیلنس درست رہے۔ پرانے ریکارڈوں میں expense_id خالی رہے گا (کوئی backfill نہیں) —
-- بند مہینوں کا حساب نہیں بدلے گا۔
alter table public.welfare_records
  add column if not exists expense_id uuid references public.expenses (id);

alter table public.student_expenses
  add column if not exists expense_id uuid references public.expenses (id);
