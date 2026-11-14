-- ============================================================
-- مرحلہ 98 — مدرسے کا لوگو (madrasa_profile.logo_url)
--          + تصویر رکھنے کی عوامی بکٹ (madrasa-logos)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 050 چل چکی ہو، پھر یہ فائل چلائیں۔
-- لوگو صرف مدرسے کی پہچان ہے — ایک مدرسے کا ایک لوگو؛ پرانے ڈیٹا
-- پر کوئی اثر نہیں (نیا خانہ خالی ہو سکتا ہے، نئی بکٹ خالی ہے)۔
-- ============================================================

-- 1) لوگو کا پتہ — مدرسے کے عمومی ریکارڈ میں (خالی ہو سکتا ہے)
alter table public.madrasa_profile
  add column if not exists logo_url text;

-- 2) تصویر رکھنے کی بکٹ — عوامی (public = true)
--    وجہ: لوگو سرخی میں سب کو دکھانا ہے، مہمان کو بھی — نجی بکٹ میں
--    مہمان تصویر نہیں دیکھ سکتا۔ (دستاویزات اور بیک اپ والی بکٹیں
--    نجی ہی رہیں گی۔)
insert into storage.buckets (id, name, public)
values ('madrasa-logos', 'madrasa-logos', true)
on conflict (id) do nothing;

-- 3) Storage کی پالیسیاں — فائل کا راستہ اپنے مدرسے کی id سے شروع
--    ہوتا ہے (<madrasa_id>/logo)، اس لیے دوسرے مدرسے کی فائل نہیں
--    کھل سکتی۔ مالک کی جانچ Server Action میں ہے (جیسے عمومی ریکارڈ)۔

-- پڑھنا: سب کے لیے (لاگ اِن + مہمان) — لوگو دکھانے کی چیز ہے
drop policy if exists "madrasa logos public read" on storage.objects;
create policy "madrasa logos public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'madrasa-logos');

-- لکھنا: صرف لاگ اِن صارف، صرف اپنے مدرسے کی فائل
drop policy if exists "own madrasa logos insert" on storage.objects;
create policy "own madrasa logos insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'madrasa-logos'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  );

-- بدلنا (دوبارہ اپلوڈ): صرف لاگ اِن صارف، صرف اپنے مدرسے کی فائل
drop policy if exists "own madrasa logos update" on storage.objects;
create policy "own madrasa logos update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'madrasa-logos'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  )
  with check (
    bucket_id = 'madrasa-logos'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  );

-- ہٹانا: صرف لاگ اِن صارف، صرف اپنے مدرسے کی فائل
drop policy if exists "own madrasa logos delete" on storage.objects;
create policy "own madrasa logos delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'madrasa-logos'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  );
