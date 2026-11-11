-- ============================================================
-- مرحلہ 53 — شعبے کی اجازت (بنین / بنات) — بنیاد
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
--
-- اصول مرحلہ 26 والا ہی ہے: پہلے سے سب کچھ اجازت شدہ ہے — صرف وہی
-- شعبہ بند ہوتا ہے جسے ایڈمن واضح طور پر بند کرے۔ کوئی قطار نہ ہو
-- تو اجازت ہے۔ اجازت ای میل سے جڑی ہے (ہر صارف کی Gmail مستقل پہچان ہے)۔
-- اس مرحلے میں ابھی کوئی روک نہیں لگے گی — صرف اجازت طے ہوگی
-- (نافذ کرنا مرحلہ 54 ہے)۔
-- ============================================================

-- 1) صارف کے شعبے کی اجازتیں — ہر صارف + ہر شعبے کی ایک قطار
create table if not exists public.user_sections (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  section text not null check (section in ('banin', 'banat')),
  allowed boolean not null default true,
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, section)
);

-- 2) مددگار فنکشن — کیا موجودہ صارف کو اس شعبے کی اجازت ہے؟
--    ایڈمن کو ہمیشہ اجازت ہے؛ کوئی قطار نہ ہو تو اجازت ہے۔
create or replace function public.my_section_allowed(p_section text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_app_admin() then true
    when exists (
      select 1 from public.user_sections
      where user_email = auth.email()
        and section = p_section
        and allowed = false
    ) then false
    else true
  end
$$;

-- 3) Row Level Security آن کریں
alter table public.user_sections enable row level security;

-- 4) پالیسیاں — صرف ایڈمن لکھ سکتا ہے؛ ہر صارف اپنی اجازتیں پڑھ سکتا ہے
drop policy if exists "app admin sections read" on public.user_sections;
create policy "app admin sections read"
  on public.user_sections for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "app admin sections insert" on public.user_sections;
create policy "app admin sections insert"
  on public.user_sections for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "app admin sections update" on public.user_sections;
create policy "app admin sections update"
  on public.user_sections for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "own sections read" on public.user_sections;
create policy "own sections read"
  on public.user_sections for select
  to authenticated
  using (user_email = auth.email());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — اجازت کا ریکارڈ کبھی حذف نہیں ہوتا؛
-- اجازت دینی ہو تو allowed = true کر دیا جاتا ہے۔
