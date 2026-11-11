-- ============================================================
-- مرحلہ 50 — تنخواہیں + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- تنخواہ خفیہ معلومات ہے — یہ شعبہ صرف ایڈمن کے لیے ہے۔
-- تنخواہ دیتے ہی اخراجات میں خودکار واؤچر (V-…) بنتا ہے، اس لیے
-- بیلنس، ماہانہ، سالانہ اور رپورٹس میں تنخواہ خودبخود شامل ہو
-- جاتی ہے — دوہرا حساب نہیں ہوتا۔
-- ایک شخص کی ایک مہینے کی تنخواہ صرف ایک بار دی جا سکتی ہے۔
-- منسوخ شدہ ادائیگی دوبارہ دی جا سکتی ہے — اس لیے انوکھا ہونے
-- کی شرط صرف فعال (active) ادائیگیوں پر ہے (partial index)۔
-- ============================================================

-- 1) تنخواہ کی ادائیگیاں — ہر اندراج ایک مدرسے سے جڑا ہوتا ہے (madrasa_id)
create table if not exists public.salary_payments (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  person_type text not null check (person_type in ('teacher', 'staff')),
  person_id uuid not null,
  salary_month text not null check (salary_month ~ '^\d{4}-\d{2}$'),
  payment_date date not null default current_date,
  amount integer not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa')),
  note text,
  expense_id uuid references public.expenses (id),
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ایک شخص، ایک مہینہ، ایک فعال ادائیگی (منسوخ شدہ دوبارہ دی جا سکتی ہے)
create unique index if not exists salary_payments_unique_active
  on public.salary_payments (madrasa_id, person_type, person_id, salary_month)
  where status = 'active';

-- 2) Row Level Security آن کریں
alter table public.salary_payments enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی تنخواہیں دیکھ/لکھ سکے
drop policy if exists "own madrasa salaries read" on public.salary_payments;
create policy "own madrasa salaries read"
  on public.salary_payments for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa salaries insert" on public.salary_payments;
create policy "own madrasa salaries insert"
  on public.salary_payments for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa salaries update" on public.salary_payments;
create policy "own madrasa salaries update"
  on public.salary_payments for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط ادائیگی کبھی حذف نہیں ہوتی،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔

-- 4) مقررہ تنخواہ — ہر استاد اور ملازم کی ماہانہ تنخواہ (خالی ہو سکتی ہے)
alter table public.teachers
  add column if not exists monthly_salary integer
  check (monthly_salary is null or monthly_salary > 0);
alter table public.staff
  add column if not exists monthly_salary integer
  check (monthly_salary is null or monthly_salary > 0);
