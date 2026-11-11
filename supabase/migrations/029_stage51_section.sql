-- مرحلہ 51 — بنین / بنات شعبہ (بنیاد)
-- ہر طالبہ، استاد، عملے اور جماعت کا شعبہ ہوگا: بنین یا بنات۔
-- پرانا ڈیٹا خودکار "بنات" ہو جائے گا (موجودہ مدرسہ للبنات ہے) —
-- کچھ دوبارہ درج نہیں کرنا پڑے گا، کوئی ریکارڈ نہیں مٹے گا۔
-- RLS پالیسیاں نہیں بدلیں — یہی میزیں، یہی پالیسیاں۔

alter table public.students
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));

alter table public.teachers
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));

alter table public.staff
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));

alter table public.classes
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));
