-- ============================================================
-- مرحلہ 90 — شعبہ اسکول (مدارس میں جدید تعلیم کا شعبہ)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 046 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- 7 میزوں کی department پابندی میں 'school' شامل کرنا۔
-- پرانا ڈیٹا ویسا ہی رہے گا — کوئی ریکارڈ نہیں بدلتا۔
-- (پابندیوں کے نام PostgreSQL کے خودکار نام ہیں:
--  <میز>_department_check — اسی لیے IF EXISTS کے ساتھ ہٹائی گئی ہیں۔)
-- ============================================================

alter table public.students drop constraint if exists students_department_check;
alter table public.students add constraint students_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));

alter table public.teachers drop constraint if exists teachers_department_check;
alter table public.teachers add constraint teachers_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));

alter table public.admissions drop constraint if exists admissions_department_check;
alter table public.admissions add constraint admissions_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));

alter table public.exams drop constraint if exists exams_department_check;
alter table public.exams add constraint exams_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));

alter table public.staff drop constraint if exists staff_department_check;
alter table public.staff add constraint staff_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));

alter table public.classes drop constraint if exists classes_department_check;
alter table public.classes add constraint classes_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));

alter table public.fee_schedule drop constraint if exists fee_schedule_department_check;
alter table public.fee_schedule add constraint fee_schedule_department_check
  check (department in ('hifz', 'nazira', 'dars_e_nizami', 'school'));
