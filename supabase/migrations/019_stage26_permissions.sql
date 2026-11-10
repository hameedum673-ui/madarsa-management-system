-- ============================================================
-- مرحلہ 26 — اختیارات اور اجازتیں (صارف کی شعبہ جات تک رسائی)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 اور 009 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- اصول: پہلے سے سب کچھ اجازت شدہ ہے — صرف وہی شعبہ بند ہوتا ہے جسے
-- ایڈمن واضح طور پر بند کرے۔ کوئی قطار نہ ہو تو اجازت ہے۔
-- "صارفین اور اکاؤنٹس" اور "اختیارات اور اجازتیں" اس میز میں نہیں ہیں —
-- وہ صرف ایڈمن کے لیے ہیں، ان کی پابندی صفحے کے کوڈ میں ہے۔
-- اجازت ای میل سے جڑی ہے (ہر صارف کی Gmail مستقل پہچان ہے)۔
-- ============================================================

-- 1) صارف کی اجازتیں — ہر صارف + ہر شعبہ کی ایک قطار
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  module text not null check (module in (
    'students', 'admissions', 'idcards', 'teachers', 'staff',
    'classes', 'att-students', 'att-teachers', 'academic', 'exams',
    'income', 'expenses', 'monthly', 'yearly', 'zakat',
    'donations', 'welfare', 'student-exp', 'fin-reports',
    'general', 'notices', 'documents', 'reports',
    'backup', 'settings'
  )),
  allowed boolean not null default true,
  updated_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_email, module)
);

-- 2) مددگار فنکشن — کیا موجودہ صارف کو اس شعبے کی اجازت ہے؟
--    ایڈمن کو ہمیشہ اجازت ہے؛ کوئی قطار نہ ہو تو اجازت ہے۔
create or replace function public.my_module_allowed(p_module text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_app_admin() then true
    when exists (
      select 1 from public.user_permissions
      where user_email = auth.email()
        and module = p_module
        and allowed = false
    ) then false
    else true
  end
$$;

-- 3) Row Level Security آن کریں
alter table public.user_permissions enable row level security;

-- 4) پالیسیاں — صرف ایڈمن لکھ سکتا ہے؛ ہر صارف اپنی اجازتیں پڑھ سکتا ہے
drop policy if exists "app admin permissions read" on public.user_permissions;
create policy "app admin permissions read"
  on public.user_permissions for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "app admin permissions insert" on public.user_permissions;
create policy "app admin permissions insert"
  on public.user_permissions for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "app admin permissions update" on public.user_permissions;
create policy "app admin permissions update"
  on public.user_permissions for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "own permissions read" on public.user_permissions;
create policy "own permissions read"
  on public.user_permissions for select
  to authenticated
  using (user_email = auth.email());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — اجازت کا ریکارڈ کبھی حذف نہیں ہوتا؛
-- اجازت دینی ہو تو allowed = true کر دیا جاتا ہے۔
