-- ============================================================
-- مرحلہ 14 — درجات اور جماعتوں کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- نوٹ: کوئی پہلے سے بھری ہوئی جماعت نہیں بنے گی — صارف اپنی جماعتیں خود شامل کرے گا۔
-- ============================================================

-- 1) جماعتیں — ہر جماعت ایک مدرسے اور ایک شعبے سے جڑی ہوتی ہے (madrasa_id)
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  name text not null,
  department text not null check (department in ('hifz', 'nazira', 'dars_e_nizami')),
  sort_order integer not null default 1 check (sort_order >= 1),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.classes enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی جماعتیں دیکھ/لکھ سکے
drop policy if exists "own madrasa classes read" on public.classes;
create policy "own madrasa classes read"
  on public.classes for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa classes insert" on public.classes;
create policy "own madrasa classes insert"
  on public.classes for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa classes update" on public.classes;
create policy "own madrasa classes update"
  on public.classes for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — جماعت کبھی حذف نہیں ہوتی،
-- صرف status = 'inactive' (غیر فعال) کی جاتی ہے۔ یہ مرحلہ 1 کا اصول ہے۔
