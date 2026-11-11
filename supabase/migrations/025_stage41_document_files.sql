-- ============================================================
-- مرحلہ 41 — دستاویزات کے ساتھ فائلیں (document_files) + Storage بکٹ
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 اور 021 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- نوٹ: کوئی فائل پہلے سے نہیں لگے گی — صارف اپنی فائلیں خود لگائے گا۔
-- ============================================================

-- 1) دستاویز کے ساتھ لگی فائلوں کا ریکارڈ
create table if not exists public.document_files (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  document_id uuid not null references public.documents (id),
  file_name text not null,
  file_path text not null,
  file_type text not null,
  file_size integer not null check (file_size > 0),
  status text not null default 'active' check (status in ('active', 'voided')),
  uploaded_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, file_path)
);

-- 2) Row Level Security آن کریں
alter table public.document_files enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی فائلیں دیکھ/لکھ سکے
drop policy if exists "own madrasa document_files read" on public.document_files;
create policy "own madrasa document_files read"
  on public.document_files for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa document_files insert" on public.document_files;
create policy "own madrasa document_files insert"
  on public.document_files for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa document_files update" on public.document_files;
create policy "own madrasa document_files update"
  on public.document_files for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — فائل کا ریکارڈ کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (چھپایا گیا) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔

-- 4) فائل رکھنے کی نجی بکٹ (public نہیں — لنک صرف لاگ اِن صارف کو ملے گا)
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- 5) Storage کی پالیسیاں — فائل کا راستہ اپنے مدرسے کی id سے شروع ہوتا ہے
--    (<madrasa_id>/<document_id>/<فائل>)، اس لیے دوسرے مدرسے کی فائل نہیں کھل سکتی
drop policy if exists "own madrasa documents read" on storage.objects;
create policy "own madrasa documents read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  );

drop policy if exists "own madrasa documents insert" on storage.objects;
create policy "own madrasa documents insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.my_madrasa_id()::text
  );
