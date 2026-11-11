-- ============================================================
-- مرحلہ 46 — سرپرست کا الگ واٹس ایپ نمبر (whatsapp_number)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 002 اور 007 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- نوٹ: پرانا رابطہ نمبر (guardian_phone) ویسا ہی رہے گا — کوئی ڈیٹا
-- نہیں مٹے گا۔ نیا خانہ خالی شروع ہوگا؛ واٹس ایپ نمبر نہ لکھا ہو تو
-- پیغام پرانے رابطہ نمبر پر ہی جائے گا۔
-- ============================================================

alter table public.students
  add column if not exists whatsapp_number text;

alter table public.admissions
  add column if not exists whatsapp_number text;
