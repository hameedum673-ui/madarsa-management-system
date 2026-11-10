-- ============================================================
-- مرحلہ 28 — دستاویزات
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
--
-- اصول: دستاویز کبھی حذف نہیں ہوتی — پرانی دستاویز محفوظ (archive)
-- کی جاتی ہے، ریکارڈ رہتا ہے۔
-- ============================================================

-- 1) دستاویزات کی میز
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  title text not null,
  doc_type text not null check (doc_type in ('registration', 'agreement', 'letter', 'certificate', 'other')),
  reference_no text,
  issued_by text,
  issue_date date,
  expiry_date date,
  note text,
  status text not null default 'active'
    check (status in ('active', 'expired', 'archived')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.documents enable row level security;

-- 3) پالیسیاں — صرف اپنے مدرسے کا ریکارڈ
drop policy if exists "own madrasa documents read" on public.documents;
create policy "own madrasa documents read"
  on public.documents for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa documents insert" on public.documents;
create policy "own madrasa documents insert"
  on public.documents for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa documents update" on public.documents;
create policy "own madrasa documents update"
  on public.documents for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — دستاویز حذف نہیں ہوتی؛ پرانی
-- دستاویز محفوظ (archived) کی جاتی ہے۔
