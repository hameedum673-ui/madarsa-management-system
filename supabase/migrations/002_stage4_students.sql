-- ============================================================
-- مرحلہ 4 — طلبہ کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- ============================================================

-- 1) طلبہ — ہر طالبہ ایک مدرسے سے جڑی ہوتی ہے (madrasa_id)
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  registration_number text not null,
  name text not null,
  father_name text not null,
  guardian_name text,
  guardian_phone text,
  date_of_birth date,
  department text not null check (department in ('hifz', 'nazira', 'dars_e_nizami')),
  class_name text,
  admission_date date not null default CURRENT_DATE,
  address text,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, registration_number)
);

-- 2) Row Level Security آن کریں
alter table public.students enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی طالبات دیکھ/لکھ سکے
drop policy if exists "own madrasa students read" on public.students;
create policy "own madrasa students read"
  on public.students for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa students insert" on public.students;
create policy "own madrasa students insert"
  on public.students for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa students update" on public.students;
create policy "own madrasa students update"
  on public.students for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — طالبہ کا ریکارڈ کبھی حذف نہیں ہوتا،
-- صرف status = 'withdrawn' (خارج) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
