-- ============================================================
-- مرحلہ 69 — مہمان لاگ ان کی خرابی کی درستی
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- خرابی: گمنام صارف کی ای میل خالی ('') ہوتی ہے، خالی (null) نہیں —
-- پرانی جانچ `auth.email() is not null` اسے عام صارف سمجھ کر
-- فنکشن سے واپس کر دیتی تھی، اس لیے مہمان کا profile کبھی بنتا ہی
-- نہیں تھا اور ڈیمو بٹن لاگ ان والے صفحے پر واپس بھیج دیتا تھا۔
-- درستی: خالی اور خالی دونوں کو گمنام مانا جائے۔
-- ============================================================

-- مہمان کا profile بنانے والا فنکشن — دوبارہ لکھا (مرحلہ 69: خرابی کی درستی)
--    باقی سب ویسے ہی جیسے مرحلہ 68 میں تھا — صرف ای میل والی جانچ بدلی۔
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
  v_num integer := 0;
begin
  if auth.uid() is null then
    return false;
  end if;
  -- مرحلہ 69 — خرابی: گمنام صارف کی ای میل خالی ('') ہوتی ہے،
  -- خالی (null) نہیں — پرانی جانچ (is not null) اسے عام صارف سمجھ
  -- کر واپس کر دیتی تھی، اس لیے مہمان کبھی بنتا ہی نہیں تھا۔
  -- اب خالی اور خالی دونوں کو گمنام مانا جاتا ہے۔
  if coalesce(auth.email(), '') <> '' then
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

  -- مرحلہ 68 — مہمان کا نمبر (کاؤنٹر ایک بڑھائیں)
  update public.guest_settings
  set guest_counter = guest_counter + 1
  where id = 1
  returning guest_counter into v_num;
  if v_num is null or v_num <= 0 then
    v_num := 1;
  end if;

  insert into public.madrasas (name)
  values ('ڈیمو مدرسہ')
  returning id into v_madrasa_id;

  insert into public.profiles (id, madrasa_id, name, role, guest_expires_at)
  values (
    auth.uid(),
    v_madrasa_id,
    'مہمان ' || v_num,
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
