-- ============================================================
-- حصہ 1 — ایک مدرسے میں کئی صارفین: بنیاد (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 040 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- یہ فائل پانچ کام کرتی ہے:
--   (1) approved_users میں member_type ('owner' / 'staff') + designation
--       (عہدہ) — پرانے سارے ریکارڈ خودبخود 'owner'۔
--   (2) system_admins میز — نظام کے ایڈمن (صرف حمید صاحب کے کھاتے،
--       migration چلاتے وقت موجودہ super_admin پروفائلوں سے)۔
--   (3) am_i_system_admin() فنکشن۔
--   (4) ensure_my_workspace() میں تبدیلی — عملہ (staff) کبھی الگ نہیں ہوگا۔
--   (5) approved_users کی RLS — مالک صرف اپنے مدرسے کی قطاریں دیکھے،
--       نظام کا ایڈمن سب کچھ (جیسا آج ہے)۔
-- ============================================================

-- 1) عملے کی پہچان — member_type + designation
alter table public.approved_users
  add column if not exists member_type text not null default 'owner'
  check (member_type in ('owner', 'staff'));

alter table public.approved_users
  add column if not exists designation text;

-- 2) نظام کے ایڈمن — چھوٹی میز + موجودہ super_admin پروفائلوں سے بھرنا
create table if not exists public.system_admins (
  user_id uuid primary key references auth.users (id)
);
alter table public.system_admins enable row level security;
-- نوٹ: کوئی پالیسی نہیں — براہِ راست پڑھنا/لکھنا کسی کو نہیں؛ صرف
-- am_i_system_admin() فنکشن (SECURITY DEFINER) اسے دیکھتا ہے۔

insert into public.system_admins (user_id)
select id from public.profiles where role = 'super_admin'
on conflict (user_id) do nothing;

-- 3) مددگار فنکشن — کیا موجودہ صارف نظام کا ایڈمن ہے؟
create or replace function public.am_i_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.system_admins
    where user_id = auth.uid()
  )
$$;

-- 4) ensure_my_workspace() — عملہ کبھی الگ نہیں ہوگا
--    (باقی سب ویسا ہی ہے جیسا migration 018 میں تھا — صرف عملے کی جانچ
--    ایڈمن والی جانچ کے بعد شامل کی گئی ہے)
create or replace function public.ensure_my_workspace()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_madrasa_id uuid;
  v_profile_count integer;
  v_name text;
  v_new_madrasa_id uuid;
  v_member_type text;
begin
  if auth.uid() is null then
    return false;
  end if;

  -- ایڈمن کو کبھی نہیں بدلا جاتا
  if public.is_app_admin() then
    return false;
  end if;

  -- عملہ (staff) مالک کے مدرسے میں ہی رہتا ہے — اسے کبھی الگ نہیں کیا جاتا
  select member_type into v_member_type
  from public.approved_users
  where email = auth.email();
  if v_member_type = 'staff' then
    return false;
  end if;

  -- میرا profile اور مدرسہ نکالیں
  select madrasa_id into v_madrasa_id
  from public.profiles
  where id = auth.uid();
  if v_madrasa_id is null then
    return false;
  end if;

  -- اس مدرسے سے کتنے صارف جڑے ہیں؟ ایک ہی ہو تو جگہ پہلے سے الگ ہے
  select count(*) into v_profile_count
  from public.profiles
  where madrasa_id = v_madrasa_id;
  if v_profile_count <= 1 then
    return false;
  end if;

  -- نیا الگ مدرسہ — نام صارف کے نام سے (نہ ہو تو ای میل کے پہلے حصے سے)
  select coalesce(
    nullif(name, ''),
    split_part(auth.email(), '@', 1)
  ) into v_name
  from public.approved_users
  where email = auth.email();
  if v_name is null or v_name = '' then
    v_name := split_part(auth.email(), '@', 1);
  end if;

  insert into public.madrasas (name)
  values (v_name || ' کا مدرسہ')
  returning id into v_new_madrasa_id;

  -- میرا profile اور منظوری کا ریکارڈ نئے مدرسے سے جوڑ دیں
  update public.profiles
  set madrasa_id = v_new_madrasa_id
  where id = auth.uid();

  update public.approved_users
  set assigned_madrasa_id = v_new_madrasa_id,
      updated_at = now()
  where email = auth.email();

  -- آڈٹ لاگ (SECURITY DEFINER ہے، اس لیے RLS اس پر لاگو نہیں ہوتی)
  insert into public.audit_log (madrasa_id, user_id, action, details)
  values (
    v_new_madrasa_id,
    auth.uid(),
    'workspace_created',
    jsonb_build_object('old_madrasa_id', v_madrasa_id::text)
  );

  return true;
exception when others then
  return false;
end;
$$;

-- 5) approved_users کی RLS — مالک صرف اپنے مدرسے کی قطاریں، نظام کا ایڈمن سب کچھ
--    (پالیسیاں OR سے ملتی ہیں، اس لیے عالمی پالیسیاں ہٹا کر محدود پالیسیاں
--    لگانی ضروری ہیں — ورنہ ہر مالک سب کچھ دیکھتا رہے گا)
drop policy if exists "app admin approved users read" on public.approved_users;
create policy "app admin approved users read"
  on public.approved_users for select
  to authenticated
  using (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or assigned_madrasa_id = public.my_madrasa_id()
    )
  );

drop policy if exists "app admin approved users insert" on public.approved_users;
create policy "app admin approved users insert"
  on public.approved_users for insert
  to authenticated
  with check (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or assigned_madrasa_id = public.my_madrasa_id()
    )
  );

drop policy if exists "app admin approved users update" on public.approved_users;
create policy "app admin approved users update"
  on public.approved_users for update
  to authenticated
  using (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or assigned_madrasa_id = public.my_madrasa_id()
    )
  )
  with check (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or assigned_madrasa_id = public.my_madrasa_id()
    )
  );
