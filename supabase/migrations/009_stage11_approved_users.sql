-- ============================================================
-- مرحلہ 11 — منظور شدہ صارفین کی میز + منظوری کی جانچ (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 008 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- اصول: صرف ایڈمن کے منظور شدہ Gmail اکاؤنٹس ہی ایپ استعمال کر سکتے ہیں۔
--        منظوری کی جانچ سرور پر ہوتی ہے (middleware + محفوظ فنکشن)۔
-- ============================================================

-- 1) منظور شدہ صارفین — ایپ کی سطح کی منظوری (ہر مدرسے کے ڈیٹا سے الگ)
create table if not exists public.approved_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  whatsapp text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'disabled')),
  assigned_role text check (assigned_role in ('super_admin', 'mohtamim', 'nazim_taleemat', 'muhasib', 'mudarris', 'clerk')),
  assigned_madrasa_id uuid references public.madrasas (id),
  approved_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) مددگار فنکشن — کیا موجودہ صارف ایڈمن (super_admin) ہے؟
create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  )
$$;

-- 3) مددگار فنکشن — موجودہ صارف کی منظوری کی حالت
--    'approved' (ایڈمن ہمیشہ منظور شدہ) / 'pending' / 'disabled' / 'none'
create or replace function public.my_approval_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_app_admin() then 'approved'
    when exists (select 1 from public.approved_users where email = auth.email() and status = 'approved') then 'approved'
    when exists (select 1 from public.approved_users where email = auth.email() and status = 'disabled') then 'disabled'
    when exists (select 1 from public.approved_users where email = auth.email() and status = 'pending') then 'pending'
    else 'none'
  end
$$;

-- 4) مددگار فنکشن — نیا صارف خود کو "زیرِ منظوری" درج کرے
--    (پہلی بار گوگل سے لاگ اِن کرنے پر، تاکہ ایڈمن درخواست دیکھ سکے)
create or replace function public.request_access()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.email();
  v_name text;
begin
  if v_email is null then
    return 'none';
  end if;
  if exists (select 1 from public.approved_users where email = v_email) then
    return (select status from public.approved_users where email = v_email);
  end if;
  select coalesce(
    (select raw_user_meta_data ->> 'full_name' from auth.users where id = auth.uid()),
    (select raw_user_meta_data ->> 'name' from auth.users where id = auth.uid()),
    split_part(v_email, '@', 1)
  ) into v_name;
  insert into public.approved_users (email, name, status)
  values (v_email, v_name, 'pending');
  return 'pending';
end;
$$;

-- 5) مددگار فنکشن — منظور شدہ صارف کا profile خود بن جائے (اگلے لاگ اِن پر)
--    (ایڈمن منظوری کے وقت کردار اور مدرسہ طے کرتا ہے؛ profile یہاں سے بنتا ہے)
create or replace function public.ensure_my_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.approved_users%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return false;
  end if;
  select * into v_row
  from public.approved_users
  where email = auth.email() and status = 'approved';
  if not found then
    return false;
  end if;
  if v_row.assigned_madrasa_id is null or v_row.assigned_role is null then
    return false;
  end if;
  insert into public.profiles (id, madrasa_id, name, role)
  values (
    auth.uid(),
    v_row.assigned_madrasa_id,
    coalesce(nullif(v_row.name, ''), split_part(auth.email(), '@', 1)),
    v_row.assigned_role
  );
  return true;
exception when others then
  return false;
end;
$$;

-- 6) Row Level Security آن کریں
alter table public.approved_users enable row level security;

-- 7) پالیسیاں — صرف ایڈمن منظور شدہ صارفین دیکھ/شامل/بدل سکتا ہے
drop policy if exists "app admin approved users read" on public.approved_users;
create policy "app admin approved users read"
  on public.approved_users for select
  to authenticated
  using (public.is_app_admin());

drop policy if exists "app admin approved users insert" on public.approved_users;
create policy "app admin approved users insert"
  on public.approved_users for insert
  to authenticated
  with check (public.is_app_admin());

drop policy if exists "app admin approved users update" on public.approved_users;
create policy "app admin approved users update"
  on public.approved_users for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — منظور شدہ صارف کا ریکارڈ کبھی حذف نہیں
-- ہوتا؛ رسائی بند کرنی ہو تو حالت «غیر فعال» کی جاتی ہے۔
-- نئے صارف کی درخواست request_access() فنکشن سے بنتی ہے (SECURITY DEFINER،
-- اس لیے RLS اس پر لاگو نہیں ہوتی)۔

-- 8) ایڈمن کا ریکارڈ — hameedum673@gmail.com مستقل منظور شدہ
--    (یہ اصلی اکاؤنٹ ہے، فرضی نہیں؛ ایڈمن کی پہچان اس کے کردار super_admin
--    سے ہوتی ہے، اس لیے ای میل فرنٹ اینڈ کوڈ میں کہیں نہیں لکھی جاتی)
insert into public.approved_users (email, name, status)
values ('hameedum673@gmail.com', 'حمید', 'approved')
on conflict (email) do update set status = 'approved';
