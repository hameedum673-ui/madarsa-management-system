-- ============================================================
-- مرحلہ 20 — صدقات اور عطیات کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- رسید نمبر خودکار ہے (D-0001، D-0002…، ہر مدرسے کی اپنی گنتی)۔
-- صدقہ اور عطیہ مدرسے کی عام آمدنی ہے (زکوٰۃ کی طرح پابند نہیں)۔
-- ============================================================

-- 1) عطیات — ہر عطیہ ایک مدرسے سے جڑا ہوتا ہے (madrasa_id)
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  receipt_number text not null,
  kind text not null check (kind in ('sadaqah', 'donation', 'other')),
  donor_name text not null,
  amount integer not null check (amount > 0),
  donation_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa')),
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, receipt_number)
);

-- 2) Row Level Security آن کریں
alter table public.donations enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کے عطیات دیکھ/لکھ سکے
drop policy if exists "own madrasa donations read" on public.donations;
create policy "own madrasa donations read"
  on public.donations for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa donations insert" on public.donations;
create policy "own madrasa donations insert"
  on public.donations for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa donations update" on public.donations;
create policy "own madrasa donations update"
  on public.donations for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط اندراج کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
