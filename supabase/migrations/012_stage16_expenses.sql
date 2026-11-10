-- ============================================================
-- مرحلہ 16 — اخراجات کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- واؤچر نمبر خودکار ہے (V-0001، V-0002…، ہر مدرسے کی اپنی گنتی)۔
-- ============================================================

-- 1) اخراجات — ہر خرچ ایک مدرسے سے جڑا ہوتا ہے (madrasa_id)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  voucher_number text not null,
  title text not null,
  category text not null check (category in ('salary', 'electricity', 'gas', 'water', 'repair', 'food', 'books', 'rent', 'other')),
  amount integer not null check (amount > 0),
  expense_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa')),
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, voucher_number)
);

-- 2) Row Level Security آن کریں
alter table public.expenses enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کے اخراجات دیکھ/لکھ سکے
drop policy if exists "own madrasa expenses read" on public.expenses;
create policy "own madrasa expenses read"
  on public.expenses for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa expenses insert" on public.expenses;
create policy "own madrasa expenses insert"
  on public.expenses for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa expenses update" on public.expenses;
create policy "own madrasa expenses update"
  on public.expenses for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط خرچ کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
