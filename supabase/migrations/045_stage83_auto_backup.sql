-- ============================================================
-- مرحلہ 83 — خودکار بیک اپ کی نجی بکٹ (backups)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 044 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- نجی بکٹ 'backups' — خودکار بیک اپ فائلیں <madrasa_id>/auto-YYYY-MM-DD.json
-- پڑھنا: صرف اپنا مدرسہ (لاگ ان صارف) — بیک اپ صفحے کی فہرست + ڈاؤن لوڈ۔
-- لکھنا/مٹانا: صارف کی کوئی پالیسی نہیں — صرف service role (کرون)
-- لکھتا اور پرانی فائلیں مٹاتا ہے۔
-- ============================================================

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

drop policy if exists "own madrasa backups read" on storage.objects;
create policy "own madrasa backups read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'backups'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  );
