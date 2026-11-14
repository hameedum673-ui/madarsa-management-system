-- ============================================================
-- مرحلہ 97 — رفتار: ایک سوال میں منظوری/مالک + ڈیش بورڈ کی گنتیاں
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 049 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- مسئلہ: ہر صفحہ کھلنے پر middleware منظوری، کردار اور مالک کے لیے
-- الگ الگ سوال پوچھتا ہے، اور ڈیش بورڈ گنتیوں کے لیے 9 الگ سوال —
-- ہر سوال ممبئی سے ڈیٹا بیس تک ایک رابطہ ہے۔
-- حل: دو نئے صرف پڑھنے والے فنکشن — دونوں پرانے فنکشنوں کو اندر سے
-- بلاتے ہیں (my_approval_status، am_i_madrasa_owner،
-- my_section_allowed)، اس لیے فیصلے بالکل ویسے ہی رہیں گے جیسے پہلے
-- تھے۔ کوڈ میں پرانا رستہ حفاظتی جال کے طور پر باقی ہے — اگر یہ
-- migration نہ چلی ہو تو سسٹم پرانے رستے سے ویسے ہی چلے گا۔
-- کوئی ڈیٹا نہیں بدلے گا، کچھ حذف نہیں ہوگا۔
-- ============================================================

-- 1) منظوری + کردار + مالک — ایک سوال میں (middleware کے لیے)
create or replace function public.my_access_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'role', (select role from public.profiles where id = auth.uid()),
    'approval', public.my_approval_status(),
    'is_owner', public.am_i_madrasa_owner(),
    'profile_exists', exists (select 1 from public.profiles where id = auth.uid()),
    'madrasa_profile_count', (select count(*) from public.profiles where madrasa_id = public.my_madrasa_id())
  )
$$;

grant execute on function public.my_access_snapshot() to authenticated;

-- 2) ڈیش بورڈ کی گنتیاں — ایک سوال میں
-- (طلبہ/اساتذہ/جماعتیں × کل/بنین/بنات — اجازت والے شعبے کی ہی گنتی)
create or replace function public.get_dashboard_counts()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'students', (
      select jsonb_build_object(
        'total', count(*) filter (where public.my_section_allowed(section)),
        'banin', count(*) filter (where section = 'banin' and public.my_section_allowed('banin')),
        'banat', count(*) filter (where section = 'banat' and public.my_section_allowed('banat'))
      )
      from public.students
      where madrasa_id = public.my_madrasa_id() and status = 'active'
    ),
    'teachers', (
      select jsonb_build_object(
        'total', count(*) filter (where public.my_section_allowed(section)),
        'banin', count(*) filter (where section = 'banin' and public.my_section_allowed('banin')),
        'banat', count(*) filter (where section = 'banat' and public.my_section_allowed('banat'))
      )
      from public.teachers
      where madrasa_id = public.my_madrasa_id() and status = 'active'
    ),
    'classes', (
      select jsonb_build_object(
        'total', count(*) filter (where public.my_section_allowed(section)),
        'banin', count(*) filter (where section = 'banin' and public.my_section_allowed('banin')),
        'banat', count(*) filter (where section = 'banat' and public.my_section_allowed('banat'))
      )
      from public.classes
      where madrasa_id = public.my_madrasa_id() and status = 'active'
    )
  )
$$;

grant execute on function public.get_dashboard_counts() to authenticated;
