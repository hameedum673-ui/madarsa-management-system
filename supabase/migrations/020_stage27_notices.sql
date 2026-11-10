-- ============================================================
-- مرحلہ 27 — اطلاعات اور اعلانات
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
--
-- اصول: اطلاع کبھی حذف نہیں ہوتی — پرانی اطلاع محفوظ (archive) کی
-- جاتی ہے، ریکارڈ رہتا ہے۔
-- ============================================================

-- 1) اطلاعات اور اعلانات کی میز
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  title text not null,
  body text,
  kind text not null check (kind in ('notice', 'announcement', 'holiday')),
  notice_date date not null default CURRENT_DATE,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.notices enable row level security;

-- 3) پالیسیاں — صرف اپنے مدرسے کا ریکارڈ
drop policy if exists "own madrasa notices read" on public.notices;
create policy "own madrasa notices read"
  on public.notices for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa notices insert" on public.notices;
create policy "own madrasa notices insert"
  on public.notices for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa notices update" on public.notices;
create policy "own madrasa notices update"
  on public.notices for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — اطلاع حذف نہیں ہوتی؛ پرانی اطلاع
-- محفوظ (archived) کی جاتی ہے۔
