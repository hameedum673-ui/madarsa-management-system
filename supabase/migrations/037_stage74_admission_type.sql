-- مرحلہ 74 — داخلے کی قسم (جدید / قدیم)
-- new = جدید (نئی طالبہ)، returning = قدیم (واپس آنے والی طالبہ)
-- پرانے ریکارڈ سب 'new' (جدید) ہو جائیں گے۔
alter table public.admissions
  add column if not exists admission_type text not null default 'new'
  check (admission_type in ('new', 'returning'));
alter table public.students
  add column if not exists admission_type text not null default 'new'
  check (admission_type in ('new', 'returning'));
