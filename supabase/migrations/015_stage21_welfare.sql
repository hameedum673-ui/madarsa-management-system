-- ============================================================
-- مرحلہ 21 — فلاحی کام (وظائف اور مالی معاونت) کی میز + Row Level Security
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 اور 002 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- ریکارڈ نمبر خودکار ہے (W-0001، W-0002…، ہر مدرسے کی اپنی گنتی)۔
-- یہ صرف معاونت کا ریکارڈ ہے — رقم خود بخود کسی بیلنس سے نہیں کٹتی۔
-- ============================================================

-- 1) فلاحی کام — ہر اندراج ایک مدرسے اور ایک طالبہ سے جڑا ہوتا ہے
create table if not exists public.welfare_records (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid not null references public.students (id),
  record_number text not null,
  kind text not null check (kind in ('scholarship', 'support', 'other')),
  amount integer not null check (amount > 0),
  record_date date not null default current_date,
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, record_number)
);

-- 2) Row Level Security آن کریں
alter table public.welfare_records enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کا ریکارڈ دیکھ/لکھ سکے
drop policy if exists "own madrasa welfare read" on public.welfare_records;
create policy "own madrasa welfare read"
  on public.welfare_records for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa welfare insert" on public.welfare_records;
create policy "own madrasa welfare insert"
  on public.welfare_records for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa welfare update" on public.welfare_records;
create policy "own madrasa welfare update"
  on public.welfare_records for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط اندراج کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
