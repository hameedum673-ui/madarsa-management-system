-- ============================================================
-- مرحلہ 102 — زبان کا ڈھانچہ: پروفائل میں زبان کا خانہ
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
--
-- اصول: ہر صارف کی اپنی زبان اس کے اپنے پروفائل میں محفوظ ہوتی ہے
-- (اردو پہلے سے طے شدہ)۔ انگریزی کا خانہ ڈیٹا بیس میں ابھی سے جائز
-- ہے تاکہ انگریزی والے مرحلے میں نئی SQL نہ چاہیے ہو — مگر ایپ
-- اس مرحلے میں صرف اردو/عربی چننے دیتی ہے۔
-- ============================================================

-- 1) پروفائل میں زبان کا خانہ
alter table public.profiles
  add column if not exists language text not null default 'ur'
  check (language in ('ur', 'ar', 'en'));

-- 2) اپنی زبان بدلنا — صرف اپنا ریکارڈ (مرحلہ 86 کے update_my_profile
-- کی طرز پر SECURITY DEFINER، کیونکہ profiles پر UPDATE کی پالیسی نہیں)
create or replace function public.set_my_language(p_language text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'لاگ ان نہیں ہے۔';
  end if;
  p_language := btrim(coalesce(p_language, ''));
  if p_language not in ('ur', 'ar', 'en') then
    raise exception 'زبان درست نہیں ہے۔';
  end if;
  update public.profiles set language = p_language where id = v_uid;
  return true;
end;
$$;

grant execute on function public.set_my_language(text) to authenticated;
