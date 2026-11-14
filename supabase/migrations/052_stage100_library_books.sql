-- ============================================================
-- مرحلہ 100 — لائبریری (کتابوں کا ریکارڈ)
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
--
-- اصول: کتاب کبھی حذف نہیں ہوتی — غلط کتاب محفوظ (archive) کی
-- جاتی ہے، ریکارڈ رہتا ہے۔
-- ============================================================

-- 1) کتابوں کی میز
create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  title text not null,
  author text,
  category text not null check (category in ('quran', 'tafsir', 'hadith', 'fiqh', 'other')),
  quantity integer not null default 1 check (quantity >= 0),
  shelf text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.library_books enable row level security;

-- 3) پالیسیاں — صرف اپنے مدرسے کا ریکارڈ
drop policy if exists "own madrasa library_books read" on public.library_books;
create policy "own madrasa library_books read"
  on public.library_books for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa library_books insert" on public.library_books;
create policy "own madrasa library_books insert"
  on public.library_books for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa library_books update" on public.library_books;
create policy "own madrasa library_books update"
  on public.library_books for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — کتاب حذف نہیں ہوتی؛ غلط کتاب
-- محفوظ (archived) کی جاتی ہے۔
