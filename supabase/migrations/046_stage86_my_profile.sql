-- ============================================================
-- مرحلہ 86 — اپنی پروفائل بدلنا (نام + واٹس ایپ نمبر)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 045 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- 1) SECURITY DEFINER فنکشن update_my_profile — صرف اپنے ریکارڈ
--    کے صرف یہ دو خانے بدلتے ہیں (عہدہ/مدرسہ/Gmail کبھی نہیں)۔
-- 2) اپنی منظوری والی قطار پڑھنے کی پالیسی (صرف اپنی قطار، صرف
--    پڑھنا) — تاکہ عملہ بھی اپنا واٹس ایپ نمبر فارم میں دیکھ سکے؛
--    ورنہ فارم خالی دکھاتا اور محفوظ کرتے وقت نمبر مٹ جاتا۔
-- ============================================================

create or replace function public.update_my_profile(p_name text, p_whatsapp text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.email(), ''));
begin
  if v_uid is null or v_email = '' then
    raise exception 'لاگ ان نہیں ہے۔';
  end if;
  p_name := btrim(coalesce(p_name, ''));
  if p_name = '' then
    raise exception 'نام لکھیں۔';
  end if;
  if char_length(p_name) > 100 then
    raise exception 'نام بہت لمبا ہے۔';
  end if;
  p_whatsapp := btrim(coalesce(p_whatsapp, ''));
  if char_length(p_whatsapp) > 30 then
    raise exception 'واٹس ایپ نمبر بہت لمبا ہے۔';
  end if;
  update public.profiles set name = p_name where id = v_uid;
  update public.approved_users
    set name = p_name, whatsapp = nullif(p_whatsapp, ''), updated_at = now()
    where lower(email) = v_email;
  return true;
end;
$$;

drop policy if exists "own approved user read" on public.approved_users;
create policy "own approved user read"
  on public.approved_users for select
  to authenticated
  using (lower(email) = lower(coalesce(auth.email(), '')));
