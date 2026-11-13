-- ============================================================
-- مرحلہ 82 — Gmail بدلنے پر ڈیٹا منتقل کرنا (workspace transfer)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 043 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- اصول: مدرسہ (madrasa_id) اپنی جگہ رہتا ہے — صارف اس میں آتا ہے۔
-- نئی Gmail کی پروفائل پرانے مدرسے سے جڑ جاتی ہے؛ پرانی پروفائل
-- ایک نئے خالی مدرسے میں منتقل کر دی جاتی ہے (مٹائی نہیں — تاکہ
-- پرانے آڈٹ لاگ میں "کس نے کیا" کا نام باقی رہے)۔
-- پرانی Gmail کی منظوری بند ہو جاتی ہے (رسائی ختم، ریکارڈ باقی)۔
-- عملے کے ارکان مدرسے سے جڑے ہیں، Gmail سے نہیں — وہ ساتھ رہتے ہیں۔
-- نئی Gmail تازہ ہونی چاہیے (اس کے اپنے مدرسے میں ڈیٹا نہ ہو)۔
-- ============================================================

create or replace function public.transfer_workspace(
  p_old_email text,
  p_new_email text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_row public.approved_users%rowtype;
  v_new_row public.approved_users%rowtype;
  v_old_uid uuid;
  v_new_uid uuid;
  v_old_madrasa uuid;
  v_old_role text;
  v_old_created_at timestamptz;
  v_old_profile_name text;
  v_new_madrasa uuid;
  v_spare_madrasa uuid;
begin
  -- صرف نظام کا ایڈمن منتقلی کر سکتا ہے
  if not public.am_i_system_admin() then
    raise exception 'صرف نظام کا ایڈمن منتقلی کر سکتا ہے۔';
  end if;

  if lower(trim(p_old_email)) = lower(trim(p_new_email)) then
    raise exception 'پرانی اور نئی Gmail ایک جیسی نہیں ہو سکتیں۔';
  end if;

  select * into v_old_row
    from public.approved_users
    where lower(email) = lower(trim(p_old_email));
  if v_old_row.id is null then
    raise exception 'پرانی Gmail منظور شدہ صارف نہیں ہے۔';
  end if;
  if v_old_row.status <> 'approved' then
    raise exception 'پرانی Gmail پہلے سے بند ہے۔';
  end if;
  if v_old_row.member_type <> 'owner' then
    raise exception 'پرانی Gmail مدرسے کی مالک نہیں ہے۔';
  end if;

  select * into v_new_row
    from public.approved_users
    where lower(email) = lower(trim(p_new_email));
  if v_new_row.id is null then
    raise exception 'نئی Gmail منظور شدہ صارف نہیں ہے — پہلے اسے منظور کریں۔';
  end if;
  if v_new_row.status <> 'approved' then
    raise exception 'نئی Gmail منظور شدہ نہیں ہے۔';
  end if;
  if v_new_row.member_type <> 'owner' then
    raise exception 'نئی Gmail مدرسے کی مالک نہیں ہے (عملے کی Gmail نہیں چلے گی)۔';
  end if;

  -- ای میل سے کھاتے کی شناخت (auth.users سے)
  select id into v_old_uid
    from auth.users where lower(email) = lower(trim(p_old_email));
  select id into v_new_uid
    from auth.users where lower(email) = lower(trim(p_new_email));
  if v_old_uid is null or v_new_uid is null then
    raise exception 'ایک کھاتہ لاگ ان والا نہیں ملا — دونوں Gmail سے ایک بار لاگ ان ہونا ضروری ہے۔';
  end if;

  -- پرانی پروفائل
  select madrasa_id, role, created_at, name
    into v_old_madrasa, v_old_role, v_old_created_at, v_old_profile_name
    from public.profiles where id = v_old_uid;
  if v_old_madrasa is null then
    raise exception 'پرانی Gmail کی پروفائل نہیں ملی۔';
  end if;

  -- نئی پروفائل + اس کا اپنا مدرسہ
  select madrasa_id into v_new_madrasa
    from public.profiles where id = v_new_uid;
  if v_new_madrasa is null then
    raise exception 'نئی Gmail کی پروفائل نہیں ملی۔';
  end if;

  -- نئی Gmail کے اپنے مدرسے میں ڈیٹا نہ ہو (تازہ Gmail کی شرط)
  if exists (select 1 from public.students where madrasa_id = v_new_madrasa)
    or exists (select 1 from public.teachers where madrasa_id = v_new_madrasa)
    or exists (select 1 from public.fee_payments where madrasa_id = v_new_madrasa) then
    raise exception 'نئی Gmail کے اپنے مدرسے میں ڈیٹا ہے — تازہ Gmail استعمال کریں۔';
  end if;

  -- پرانی پروفائل کو نئے خالی مدرسے میں منتقل کریں (کردار clerk،
  -- تاکہ وہ پہلے ایڈمن کی گنتی میں نہ آئے اور آڈٹ کا نام باقی رہے)
  insert into public.madrasas (id, name)
    values (
      gen_random_uuid(),
      coalesce(v_old_profile_name, 'پرانا صارف') || ' کا پرانا مدرسہ'
    )
    returning id into v_spare_madrasa;
  update public.profiles
    set madrasa_id = v_spare_madrasa, role = 'clerk'
    where id = v_old_uid;

  -- نئی پروفائل پرانے مدرسے میں (کردار + پہلے ایڈمن کی تاریخ ساتھ)
  update public.profiles
    set madrasa_id = v_old_madrasa,
        role = v_old_role,
        created_at = v_old_created_at
    where id = v_new_uid;

  -- نئی منظوری کی قطار پرانے مدرسے سے جوڑیں
  update public.approved_users
    set assigned_madrasa_id = v_old_madrasa,
        assigned_role = v_old_row.assigned_role
    where id = v_new_row.id;
  -- پرانی منظوری بند (رسائی ختم، ریکارڈ باقی)
  update public.approved_users
    set status = 'disabled'
    where id = v_old_row.id;

  -- اجازتیں / شعبے: نئی والی قطاریں مٹا کر پرانی والی کا ای میل بدلیں
  delete from public.user_permissions where user_email = v_new_row.email;
  update public.user_permissions
    set user_email = v_new_row.email
    where user_email = v_old_row.email;
  delete from public.user_sections where user_email = v_new_row.email;
  update public.user_sections
    set user_email = v_new_row.email
    where user_email = v_old_row.email;

  -- نظام کے ایڈمن کی فہرست: پرانا uid ہٹا کر نیا uid ڈالیں
  if exists (select 1 from public.system_admins where user_id = v_old_uid) then
    delete from public.system_admins where user_id = v_old_uid;
    insert into public.system_admins (user_id)
      values (v_new_uid)
      on conflict (user_id) do nothing;
  end if;

  -- آڈٹ لاگ
  insert into public.audit_log (madrasa_id, user_id, action, details)
  values (
    v_old_madrasa,
    auth.uid(),
    'workspace_transferred',
    jsonb_build_object(
      'old_email', v_old_row.email,
      'new_email', v_new_row.email
    )
  );

  return true;
end;
$$;
