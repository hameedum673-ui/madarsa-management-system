-- مرحلہ 52 — امتحان کا شعبہ (بنین / بنات)
-- امتحان خود ایک الگ ریکارڈ ہے (پہلے امتحان بنتا ہے، پھر طالبات کا
-- نتیجہ لگتا ہے)، اس لیے اسے اپنا شعبہ چاہیے۔
-- پرانے امتحان خودکار "بنات" ہو جائیں گے — کچھ دوبارہ درج نہیں
-- کرنا پڑے گا۔ RLS پالیسیاں نہیں بدلیں۔

alter table public.exams
  add column if not exists section text not null default 'banat'
  check (section in ('banin', 'banat'));
