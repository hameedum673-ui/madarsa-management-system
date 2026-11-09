-- ============================================================
-- مرحلہ 8 — فیس اور رسیدوں کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 005 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- ============================================================

-- 1) فیس کی ادائیگیاں — ہر ادائیگی کی اپنی رسید ہوتی ہے
create table if not exists public.fee_payments (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid not null references public.students (id),
  receipt_number text not null,
  fee_month text not null,
  amount integer not null check (amount > 0),
  payment_date date not null default CURRENT_DATE,
  payment_method text not null check (payment_method in ('cash', 'bank', 'jazzcash', 'easypaisa')),
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  received_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, receipt_number)
);

-- 2) Row Level Security آن کریں
alter table public.fee_payments enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی فیس دیکھ/لکھ سکے
drop policy if exists "own madrasa fee payments read" on public.fee_payments;
create policy "own madrasa fee payments read"
  on public.fee_payments for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa fee payments insert" on public.fee_payments;
create policy "own madrasa fee payments insert"
  on public.fee_payments for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa fee payments update" on public.fee_payments;
create policy "own madrasa fee payments update"
  on public.fee_payments for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — مالی ریکارڈ کبھی حذف نہیں ہوتا؛
-- غلط رسید صرف «منسوخ» (voided) کی جاتی ہے، ریکارڈ رہتا ہے اور رقم کل سے نکل جاتی ہے۔
