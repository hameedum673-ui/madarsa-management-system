-- ============================================================
-- حصہ 3 — عملے کی اجازتیں: بنیاد (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 041 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- یہ فائل دو کام کرتی ہے:
--   (1) user_permissions کی جانچ میں 'ushr' شامل کرنا — مرحلہ 48 میں
--       عشر کا ماڈیول بنا تھا مگر اس میز کی جانچ میں 'ushr' رہ گیا تھا،
--       اس لیے اجازتیں محفوظ کرنے کی ہر کوشش اسی قطار پر ناکام ہوتی تھی
--       (عالمی صفحہ بھی)۔ یہ اصل خرابی ہے جو حصہ 3 بناتے وقت ملی —
--       اس کے بغیر عملے کی اجازتیں بن ہی نہیں سکتیں۔
--   (2) user_permissions اور user_sections کی RLS — مالک صرف اپنے مدرسے
--       کے عملے کی اجازتیں دیکھ/بدل سکے؛ نظام کا ایڈمن سب کچھ (جیسا آج ہے)۔
--       (براہِ راست API سے بھی کوئی مالک دوسرے مدرسے کی اجازتیں نہ بدل سکے)
-- ============================================================

-- 1) 'ushr' کی جانچ — پرانی جانچ ہٹا کر نئی لگائیں (دوبارہ چلانے پر بھی ٹھیک)
alter table public.user_permissions
  drop constraint if exists user_permissions_module_check;

do $$
declare
  v_con text;
begin
  select conname into v_con
  from pg_constraint
  where conrelid = 'public.user_permissions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) not like '%ushr%';
  if v_con is not null then
    execute format('alter table public.user_permissions drop constraint %I', v_con);
  end if;
end $$;

alter table public.user_permissions
  add constraint user_permissions_module_check
  check (module in (
    'students', 'admissions', 'idcards', 'teachers', 'staff',
    'classes', 'att-students', 'att-teachers', 'academic', 'exams',
    'income', 'expenses', 'monthly', 'yearly', 'zakat', 'ushr',
    'donations', 'welfare', 'student-exp', 'fin-reports',
    'general', 'notices', 'documents', 'reports',
    'backup', 'settings'
  ));

-- 2) user_permissions کی RLS — مالک صرف اپنے مدرسے کی قطاریں
drop policy if exists "app admin permissions read" on public.user_permissions;
create policy "app admin permissions read"
  on public.user_permissions for select
  to authenticated
  using (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
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
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
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
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
        select 1 from public.approved_users
        where email = user_permissions.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  )
  with check (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
        select 1 from public.approved_users
        where email = user_permissions.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );

-- 3) user_sections کی RLS — مالک صرف اپنے مدرسے کی قطاریں
drop policy if exists "app admin sections read" on public.user_sections;
create policy "app admin sections read"
  on public.user_sections for select
  to authenticated
  using (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
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
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
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
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
        select 1 from public.approved_users
        where email = user_sections.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  )
  with check (
    public.is_app_admin()
    and (
      public.am_i_system_admin()
      or exists (
        select 1 from public.approved_users
        where email = user_sections.user_email
          and assigned_madrasa_id = public.my_madrasa_id()
      )
    )
  );
