-- ============================================================
-- حصہ 4 کی درستگی — مدرسے کا مالک اور نظام کا ایڈمن الگ
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 042 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- مسئلہ: نظام "سپر ایڈمن" کو ہی مالک سمجھتا تھا — مگر نئے مدرسے کا مالک
-- (مہتمم/ناظم وغیرہ) سپر ایڈمن نہیں ہوتا، اس لیے اس کے اپنے مدرسے کے
-- صفحے (عمومی ریکارڈ، بیک اپ، عملہ، تنخواہیں) 404 دکھاتے تھے۔
-- یہ فائل "کیا میں اپنے مدرسے کا مالک ہوں؟" کی جانچ بناتی ہے اور
-- اجازتوں کی پالیسیوں میں مالک کو بھی جگہ دیتی ہے:
--   * approved_users: مالک صرف اپنے مدرسے کے عملے کی قطاریں دیکھ/بدل سکتا ہے
--     (شامل کرنا: صرف عملے کی قطار؛ مالک کی قطار صرف نظام کا ایڈمن بنا سکتا ہے)
--   * user_permissions / user_sections: مالک صرف اپنے مدرسے کے عملے کی
--     اجازتیں دیکھ/بدل سکتا ہے
-- نظام کا ایڈمن سب کچھ ویسے ہی کر سکتا ہے؛ عملے کو کچھ نیا نہیں ملتا۔
-- ============================================================

-- 1) کیا موجودہ صارف اپنے مدرسے کا مالک ہے؟
create or replace function public.am_i_madrasa_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.approved_users
    where email = auth.email()
      and status = 'approved'
      and member_type = 'owner'
      and assigned_madrasa_id is not null
  )
$$;

-- 2) approved_users کی RLS — مالک بھی اپنے مدرسے کے عملے تک
drop policy if exists "app admin approved users read" on public.approved_users;
create policy "app admin approved users read"
  on public.approved_users for select
  to authenticated
  using (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and assigned_madrasa_id = public.my_madrasa_id()
    )
  );

drop policy if exists "app admin approved users insert" on public.approved_users;
create policy "app admin approved users insert"
  on public.approved_users for insert
  to authenticated
  with check (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and assigned_madrasa_id = public.my_madrasa_id()
      and member_type = 'staff'
    )
  );

drop policy if exists "app admin approved users update" on public.approved_users;
create policy "app admin approved users update"
  on public.approved_users for update
  to authenticated
  using (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and assigned_madrasa_id = public.my_madrasa_id()
      and member_type = 'staff'
    )
  )
  with check (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and assigned_madrasa_id = public.my_madrasa_id()
      and member_type = 'staff'
    )
  );

-- 3) user_permissions کی RLS — مالک بھی اپنے مدرسے کے عملے کی اجازتیں
drop policy if exists "app admin permissions read" on public.user_permissions;
create policy "app admin permissions read"
  on public.user_permissions for select
  to authenticated
  using (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_permissions.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );

drop policy if exists "app admin permissions insert" on public.user_permissions;
create policy "app admin permissions insert"
  on public.user_permissions for insert
  to authenticated
  with check (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_permissions.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );

drop policy if exists "app admin permissions update" on public.user_permissions;
create policy "app admin permissions update"
  on public.user_permissions for update
  to authenticated
  using (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_permissions.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  )
  with check (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_permissions.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );

-- 4) user_sections کی RLS — مالک بھی اپنے مدرسے کے عملے کے شعبے
drop policy if exists "app admin sections read" on public.user_sections;
create policy "app admin sections read"
  on public.user_sections for select
  to authenticated
  using (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_sections.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );

drop policy if exists "app admin sections insert" on public.user_sections;
create policy "app admin sections insert"
  on public.user_sections for insert
  to authenticated
  with check (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_sections.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );

drop policy if exists "app admin sections update" on public.user_sections;
create policy "app admin sections update"
  on public.user_sections for update
  to authenticated
  using (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_sections.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  )
  with check (
    public.am_i_system_admin()
    or (
      public.am_i_madrasa_owner()
      and exists (
        select 1 from public.approved_users
        where email = user_sections.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );
