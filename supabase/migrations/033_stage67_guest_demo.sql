-- ============================================================
-- مرحلہ 67 — مہمان (ڈیمو) رسائی
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- مہمان بغیر جی میل کے "ڈیمو دیکھیں" بٹن سے آتا ہے (گمنام لاگ اِن) —
-- اسے اپنا الگ خالی نہیں، نمونہ ڈیٹا والا ڈیش بورڈ ملتا ہے، اور
-- وقت ختم ہونے پر رسائی خودبخود بند ہو جاتی ہے۔
-- نوٹ: گمنام لاگ اِن (Anonymous Sign-Ins) Supabase ڈیش بورڈ میں
-- آن کرنا ہوگا — ورنہ بٹن کام نہیں کرے گا۔
-- ============================================================

-- 1) profiles میں مہمان کے ختم ہونے کا وقت (خالی = عام صارف)
alter table public.profiles
  add column if not exists guest_expires_at timestamptz;

-- 2) مہمان رسائی کی ترتیب — ایک قطار (id = 1)
create table if not exists public.guest_settings (
  id integer primary key,
  allow_guests boolean not null default false,
  guest_hours integer not null default 2 check (guest_hours > 0),
  updated_at timestamptz not null default now()
);
insert into public.guest_settings (id, allow_guests, guest_hours)
values (1, false, 2)
on conflict (id) do nothing;

alter table public.guest_settings enable row level security;
-- سب پڑھ سکتے ہیں — لاگ ان والے صفحے کو بٹن دکھانے کے لیے
drop policy if exists "guest settings read" on public.guest_settings;
create policy "guest settings read"
  on public.guest_settings for select
  to anon, authenticated
  using (true);
-- بدل صرف ایڈمن سکتا ہے
drop policy if exists "guest settings admin all" on public.guest_settings;
create policy "guest settings admin all"
  on public.guest_settings for all
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

-- 2ب) مہمانوں کے profile ایڈمن پڑھ/بند کر سکے — عام صارفین کے
--     profile دوسرے مدرسے کے ہوتے ہیں، اس لیے عام پالیسی
--     ("own madrasa profiles read") انہیں چھپاتی ہے۔ یہ پالیسی
--     صرف مہمانوں (guest_expires_at بھرا ہوا) کے لیے ہے۔
drop policy if exists "app admin guest profiles read" on public.profiles;
create policy "app admin guest profiles read"
  on public.profiles for select
  to authenticated
  using (public.is_app_admin() and guest_expires_at is not null);
drop policy if exists "app admin guest profiles update" on public.profiles;
create policy "app admin guest profiles update"
  on public.profiles for update
  to authenticated
  using (public.is_app_admin() and guest_expires_at is not null)
  with check (public.is_app_admin() and guest_expires_at is not null);

-- 3) مہمان کی حالت بتانے والا فنکشن
--    'active' = وقت باقی ہے اور سوئچ آن ہے؛
--    'expired' = وقت ختم ہو گیا؛
--    'not_guest' = عام صارف، یا profile نہیں، یا سوئچ بند ہے۔
create or replace function public.my_guest_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (
      select 1 from public.profiles where id = auth.uid()
    ) then 'not_guest'
    when exists (
      select 1 from public.profiles
      where id = auth.uid()
        and guest_expires_at is not null
        and guest_expires_at > now()
        and coalesce(
          (select allow_guests from public.guest_settings where id = 1),
          false
        )
    ) then 'active'
    when exists (
      select 1 from public.profiles
      where id = auth.uid()
        and guest_expires_at is not null
        and guest_expires_at <= now()
    ) then 'expired'
    else 'not_guest'
  end
$$;

-- 4) مہمان کا profile بنانے والا فنکشن (نمونہ ڈیٹا سمیت)
--    صرف گمنام صارف کے لیے (ای میل خالی) — عام صارف پر کچھ نہیں کرتا۔
--    سوئچ بند ہو تو مہمان نہیں بنتا۔ ایک ہی لین دین میں سب کچھ
--    بنتا ہے — کہیں غلطی ہو تو کچھ بھی نہیں بنتا۔
create or replace function public.ensure_my_guest_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer := 2;
  v_madrasa_id uuid;
  v_s1 uuid;
  v_s2 uuid;
  v_exam_id uuid;
  v_month text := to_char(CURRENT_DATE, 'YYYY-MM');
begin
  if auth.uid() is null then
    return false;
  end if;
  if auth.email() is not null then
    return false;
  end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    return false;
  end if;
  if not coalesce(
    (select allow_guests from public.guest_settings where id = 1),
    false
  ) then
    return false;
  end if;
  select guest_hours into v_hours
  from public.guest_settings where id = 1;
  if v_hours is null or v_hours <= 0 then
    v_hours := 2;
  end if;

  insert into public.madrasas (name)
  values ('ڈیمو مدرسہ')
  returning id into v_madrasa_id;

  insert into public.profiles (id, madrasa_id, name, role, guest_expires_at)
  values (
    auth.uid(),
    v_madrasa_id,
    'مہمان',
    'clerk',
    now() + (v_hours || ' hours')::interval
  );

  -- نمونہ ڈیٹا — نام "نمونہ" سے شروع تاکہ صاف پتا چلے کہ فرضی ہیں
  insert into public.classes (madrasa_id, name, department, section)
  values
    (v_madrasa_id, 'درجہ اول', 'dars_e_nizami', 'banat'),
    (v_madrasa_id, 'حفظ — پارہ 1', 'hifz', 'banat');

  insert into public.students
    (madrasa_id, registration_number, name, father_name, guardian_phone,
     department, class_name, section)
  values
    (v_madrasa_id, '0001', 'نمونہ طالبہ 1', 'نمونہ والد 1', '03000000001',
     'dars_e_nizami', 'درجہ اول', 'banat')
  returning id into v_s1;

  insert into public.students
    (madrasa_id, registration_number, name, father_name, guardian_phone,
     department, class_name, section)
  values
    (v_madrasa_id, '0002', 'نمونہ طالبہ 2', 'نمونہ والد 2', '03000000002',
     'dars_e_nizami', 'درجہ اول', 'banat')
  returning id into v_s2;

  insert into public.students
    (madrasa_id, registration_number, name, father_name, guardian_phone,
     department, class_name, section)
  values
    (v_madrasa_id, '0003', 'نمونہ طالبہ 3', 'نمونہ والد 3', '03000000003',
     'hifz', 'حفظ — پارہ 1', 'banat');

  insert into public.students
    (madrasa_id, registration_number, name, father_name, guardian_phone,
     department, class_name, section)
  values
    (v_madrasa_id, '0004', 'نمونہ طالبہ 4', 'نمونہ والد 4', '03000000004',
     'nazira', null, 'banat');

  insert into public.students
    (madrasa_id, registration_number, name, father_name, guardian_phone,
     department, class_name, section)
  values
    (v_madrasa_id, '0005', 'نمونہ طالب 1', 'نمونہ والد 5', '03000000005',
     'dars_e_nizami', 'درجہ اول', 'banin');

  insert into public.teachers
    (madrasa_id, name, father_name, department, section)
  values
    (v_madrasa_id, 'نمونہ استاد 1', 'نمونہ والد', 'dars_e_nizami', 'banat'),
    (v_madrasa_id, 'نمونہ استاد 2', 'نمونہ والد', 'hifz', 'banat');

  insert into public.fee_payments
    (madrasa_id, student_id, receipt_number, fee_month, amount,
     payment_method, received_by)
  values
    (v_madrasa_id, v_s1, 'R-0001', v_month, 1000, 'cash', auth.uid()),
    (v_madrasa_id, v_s2, 'R-0002', v_month, 1000, 'cash', auth.uid());

  insert into public.expenses
    (madrasa_id, voucher_number, title, category, amount,
     payment_method, section, created_by)
  values
    (v_madrasa_id, 'V-0001', 'بجلی کا بل (نمونہ)', 'electricity', 2000,
     'cash', 'banat', auth.uid());

  insert into public.donations
    (madrasa_id, receipt_number, kind, donor_name, amount,
     payment_method, section, created_by)
  values
    (v_madrasa_id, 'D-0001', 'donation', 'نمونہ عطیہ دہندہ', 5000,
     'cash', 'banat', auth.uid());

  insert into public.exams
    (madrasa_id, name, department, class_name, section, subjects,
     created_by)
  values
    (v_madrasa_id, 'سہ ماہی امتحان (نمونہ)', 'dars_e_nizami', 'درجہ اول',
     'banat', ARRAY['صرف', 'نحو'], auth.uid())
  returning id into v_exam_id;

  insert into public.exam_results
    (madrasa_id, exam_id, student_id, subject, marks_obtained)
  values
    (v_madrasa_id, v_exam_id, v_s1, 'صرف', 85),
    (v_madrasa_id, v_exam_id, v_s1, 'نحو', 78),
    (v_madrasa_id, v_exam_id, v_s2, 'صرف', 70),
    (v_madrasa_id, v_exam_id, v_s2, 'نحو', 65);

  return true;
exception when others then
  return false;
end;
$$;
