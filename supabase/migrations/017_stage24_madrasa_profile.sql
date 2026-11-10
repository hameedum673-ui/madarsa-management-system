-- ============================================================
-- مرحلہ 24 — مدرسے کا عمومی ریکارڈ (پروفائل) کی میز + Row Level Security
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- ہر مدرسے کا ایک ہی پروفائل ریکارڈ ہوتا ہے (madrasa_id منفرد)۔
-- نام `madrasas` میز میں محفوظ ہے — پروفائل صفحے سے نام بدلنے پر وہیں
-- بدلا جاتا ہے، تاکہ رسیدوں اور کارڈوں پر بھی نیا نام نظر آئے۔
-- ============================================================

-- 1) مدرسے کا عمومی ریکارڈ — ہر مدرسے کا ایک ریکارڈ
create table if not exists public.madrasa_profile (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null unique references public.madrasas (id),
  address text,
  phone text,
  whatsapp text,
  email text,
  mohtamim_name text,
  established_year integer,
  registration_no text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.madrasa_profile enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کا ریکارڈ دیکھ/لکھ سکے
drop policy if exists "own madrasa profile read" on public.madrasa_profile;
create policy "own madrasa profile read"
  on public.madrasa_profile for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa profile insert" on public.madrasa_profile;
create policy "own madrasa profile insert"
  on public.madrasa_profile for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa profile update" on public.madrasa_profile;
create policy "own madrasa profile update"
  on public.madrasa_profile for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — پروفائل کبھی حذف نہیں ہوتا۔
-- (تبدیلی صرف ایڈمن کر سکتا ہے — یہ جانچ صفحے کے کوڈ میں ہے۔)
