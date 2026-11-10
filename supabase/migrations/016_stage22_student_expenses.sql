-- ============================================================
-- مرحلہ 22 — طلبہ کے اخراجات کی میز + Row Level Security
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 اور 002 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- ریکارڈ نمبر خودکار ہے (SE-0001، SE-0002…، ہر مدرسے کی اپنی گنتی)۔
-- یہ صرف فی طالبہ خرچ کا ریکارڈ ہے — رقم خود بخود کسی بیلنس سے نہیں کٹتی۔
-- ============================================================

-- 1) طلبہ کے اخراجات — ہر اندراج ایک مدرسے اور ایک طالبہ سے جڑا ہوتا ہے
create table if not exists public.student_expenses (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid not null references public.students (id),
  record_number text not null,
  category text not null check (category in ('books', 'clothes', 'medical', 'food', 'other')),
  amount integer not null check (amount > 0),
  expense_date date not null default current_date,
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, record_number)
);

-- 2) Row Level Security آن کریں
alter table public.student_expenses enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کا ریکارڈ دیکھ/لکھ سکے
drop policy if exists "own madrasa student expenses read" on public.student_expenses;
create policy "own madrasa student expenses read"
  on public.student_expenses for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa student expenses insert" on public.student_expenses;
create policy "own madrasa student expenses insert"
  on public.student_expenses for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa student expenses update" on public.student_expenses;
create policy "own madrasa student expenses update"
  on public.student_expenses for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط اندراج کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
