-- ============================================================
-- مرحلہ 19 — زکوٰۃ کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- رسید نمبر خودکار ہے (Z-0001، Z-0002…، ہر مدرسے کی اپنی گنتی)۔
-- زکوٰۃ کا پیسہ الگ فنڈ ہے — یہ فیس اور عام اخراجات سے نہیں ملتا۔
-- ============================================================

-- 1) زکوٰۃ — ہر اندراج ایک مدرسے سے جڑا ہوتا ہے (madrasa_id)
create table if not exists public.zakat_records (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  receipt_number text not null,
  kind text not null check (kind in ('received', 'distributed')),
  person_name text not null,
  amount integer not null check (amount > 0),
  record_date date not null default current_date,
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa')),
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, receipt_number)
);

-- 2) Row Level Security آن کریں
alter table public.zakat_records enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کا زکوٰۃ ریکارڈ دیکھ/لکھ سکے
drop policy if exists "own madrasa zakat read" on public.zakat_records;
create policy "own madrasa zakat read"
  on public.zakat_records for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa zakat insert" on public.zakat_records;
create policy "own madrasa zakat insert"
  on public.zakat_records for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa zakat update" on public.zakat_records;
create policy "own madrasa zakat update"
  on public.zakat_records for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط اندراج کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
