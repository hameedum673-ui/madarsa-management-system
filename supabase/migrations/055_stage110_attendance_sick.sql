-- ============================================================
-- مرحلہ 110 — حاضری کی حالت بدلیں: 'تاخیر' ہٹائیں، 'مریض' لگائیں
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 054 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- پرانے 'late' والے ریکارڈ 'present' کر دیے جاتے ہیں — دیر سے آنے والا
-- طالب علم / استاد حاضر ہی تھا (نظام خود بھی اسے فیصد میں حاضر گنتا تھا)۔
-- اس کے بعد دونوں میزوں کی پابندی 'sick' والی ہوگی — ہمیشہ چار حالتیں:
-- present / absent / leave / sick۔
-- (پابندیوں کے نام PostgreSQL کے خودکار نام ہیں:
--  <میز>_status_check — اسی لیے IF EXISTS کے ساتھ ہٹائی گئی ہیں۔)
-- ============================================================

-- 1) طلبہ کی حاضری — پرانی 'تاخیر' حاضر کریں
update public.student_attendance set status = 'present' where status = 'late';

alter table public.student_attendance drop constraint if exists student_attendance_status_check;
alter table public.student_attendance add constraint student_attendance_status_check
  check (status in ('present', 'absent', 'leave', 'sick'));

-- 2) اساتذہ کی حاضری — پرانی 'تاخیر' حاضر کریں
update public.teacher_attendance set status = 'present' where status = 'late';

alter table public.teacher_attendance drop constraint if exists teacher_attendance_status_check;
alter table public.teacher_attendance add constraint teacher_attendance_status_check
  check (status in ('present', 'absent', 'leave', 'sick'));
