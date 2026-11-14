-- ============================================================
-- مرحلہ 94 — مالک کی منظوری والی قطار میں مدرسے کا لنک بھرنا
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 048 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- مسئلہ: اصل اکاؤنٹ (حمید) کی منظوری والی قطار (approved_users)
-- میں مدرسے کا لنک (assigned_madrasa_id) خالی ہے — پہلے دن کی
-- سیڈ (migration 009) نے صرف ای میل، نام اور حیثیت لکھی تھی،
-- مدرسہ نہیں جڑا تھا۔ اس لیے am_i_madrasa_owner() غلط بتاتا ہے:
-- بیک اپ صفحہ 404 دیتا ہے، اور خودکار بیک اپ والا کرون اصل
-- مدرسے کو چھوڑ دیتا ہے۔ دوسرے Gmail کی قطار کا لنک بعد میں
-- جڑ گیا تھا (جب اسے اپنا الگ مدرسہ ملا)، اسی لیے اس کا بیک اپ
-- صفحہ کھلتا ہے۔
-- حل: جن منظور شدہ مالک قطاروں کا لنک خالی ہے، ان کا لنک ان کے
-- اپنے پروفائل والے مدرسے سے بھر دیں (ای میل سے جوڑ کر)۔
-- کوئی ریکارڈ نہیں مٹے گا، کوئی نیا ریکارڈ نہیں بنے گا — صرف
-- خالی جگہ بھری جائے گی۔ کوڈ میں کچھ نہیں بدلنا۔
-- ============================================================

update public.approved_users au
set assigned_madrasa_id = p.madrasa_id,
    updated_at = now()
from auth.users u
join public.profiles p on p.id = u.id
where au.email = u.email
  and au.assigned_madrasa_id is null
  and au.status = 'approved'
  and au.member_type = 'owner'
  and p.madrasa_id is not null;

-- جانچ (چلانے کے بعد — یہ صرف دکھاتا ہے، کچھ نہیں بدلتا):
-- select email, status, member_type, assigned_madrasa_id
-- from public.approved_users
-- where status = 'approved' and member_type = 'owner';
-- اصل اکاؤنٹ کی قطار میں اب assigned_madrasa_id بھرا ہونا چاہیے۔
