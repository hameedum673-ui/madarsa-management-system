-- ============================================================
-- مرحلہ 25 — صارف کی علیحدگی: ہر صارف کا اپنا الگ مدرسہ (اپنی الگ جگہ)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 اور 009 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- مسئلہ: منظوری ہر نئے صارف کو ایڈمن کے مدرسے سے جوڑ دیتی تھی، اس لیے
-- ساتھی کو ایڈمن کا ڈیٹا نظر آتا تھا۔ RLS پہلے سے مدرسے کے حساب سے ہے،
-- اس لیے حل یہ ہے کہ ہر صارف کا اپنا الگ مدرسہ ہو — پھر وہی RLS ہر صارف
-- کو صرف اپنا ڈیٹا دکھاتی ہے۔ ایڈمن کا مدرسہ اور ڈیٹا نہیں چھیڑا جاتا۔
--
-- یہ فائل تین کام کرتی ہے:
--   (1) madrasas پر ایڈمن کے لیے INSERT پالیسی (منظوری کے وقت نیا مدرسہ
--       بنانے کے لیے) + اپنے مدرسے کی UPDATE پالیسی (نام بدلنے کے لیے —
--       یہ پالیسی نہ ہونے کی وجہ سے مرحلہ 24 کا نام بدلنے والا حصہ بھی
--       خاموشی سے کام نہیں کرتا تھا)۔
--   (2) ensure_my_workspace() فنکشن — پہلے سے منظور شدہ صارف جو کسی
--       اور کے مدرسے سے جڑا ہوا ہے، اگلے لاگ اِن پر اسے نیا الگ مدرسہ
--       مل جاتا ہے۔ اس کا اپنا ریکارڈ کہیں نہیں جاتا، اور ایڈمن کا ڈیٹا
--       نہیں چھیڑا جاتا۔
-- ============================================================

-- 1) مدرسے بنانا — صرف ایڈمن (منظوری کے وقت نئے صارف کا الگ مدرسہ بنتا ہے)
drop policy if exists "app admin madrasa insert" on public.madrasas;
create policy "app admin madrasa insert"
  on public.madrasas for insert
  to authenticated
  with check (public.is_app_admin());

-- 2) اپنے مدرسے کا نام بدلنا — صرف اپنا مدرسہ (مرحلہ 24 کا نام بدلنا)
drop policy if exists "own madrasa update" on public.madrasas;
create policy "own madrasa update"
  on public.madrasas for update
  to authenticated
  using (id = public.my_madrasa_id())
  with check (id = public.my_madrasa_id());

-- 3) مددگار فنکشن — میرا الگ مدرسہ یقینی بنائیں (اگلے لاگ اِن پر)
--    (ایڈمن کو کبھی نہیں بدلا جاتا — اس کا مدرسہ اور ڈیٹا ویسا ہی رہتا ہے)
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
begin
  if auth.uid() is null then
    return false;
  end if;

  -- ایڈمن کو کبھی نہیں بدلا جاتا
  if public.is_app_admin() then
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
