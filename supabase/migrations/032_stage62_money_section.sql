-- مرحلہ 62 — رقم والے ریکارڈوں پر شعبہ (بنین / بنات)
-- عطیات، زکوٰۃ، عشر اور اخراجات کا شعبہ ہوگا: بنین یا بنات۔
-- پرانا ڈیٹا خودکار "بنات" ہو جائے گا (موجودہ مدرسہ للبنات ہے) —
-- کچھ دوبارہ درج نہیں کرنا پڑے گا، کوئی ریکارڈ نہیں مٹے گا۔
-- RLS پالیسیاں نہیں بدلیں — یہی میزیں، یہی پالیسیاں۔

alter table public.donations
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));

alter table public.zakat_records
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));

alter table public.ushr_records
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));

alter table public.expenses
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));
