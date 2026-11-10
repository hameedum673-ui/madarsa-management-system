-- ============================================================
-- مرحلہ 13 — عملے (غیر تدریسی) کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- نوٹ: تنخواہ اس میز میں نہیں ہے — تنخواہ خفیہ معلومات ہے، الگ مرحلہ ہوگا۔
-- ============================================================

-- 1) عملہ — ہر فرد ایک مدرسے سے جڑا ہوتا ہے (madrasa_id)
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  name text not null,
  father_name text not null,
  phone text,
  cnic text,
  qualification text,
  department text not null check (department in ('hifz', 'nazira', 'dars_e_nizami')),
  position text,
  joining_date date not null default CURRENT_DATE,
  address text,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.staff enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کا عملہ دیکھ/لکھ سکے
drop policy if exists "own madrasa staff read" on public.staff;
create policy "own madrasa staff read"
  on public.staff for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa staff insert" on public.staff;
create policy "own madrasa staff insert"
  on public.staff for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa staff update" on public.staff;
create policy "own madrasa staff update"
  on public.staff for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — عملے کا ریکارڈ کبھی حذف نہیں ہوتا،
-- صرف status = 'withdrawn' (خارج) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
