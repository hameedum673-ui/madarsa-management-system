-- ============================================================
-- مرحلہ 101 — کتاب دینا اور واپس لینا
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 052 چل چکی ہو، پھر یہ فائل چلائیں۔
--
-- اصول: دینے/واپسی کا ریکارڈ کبھی حذف نہیں ہوتا — تاریخ رہتی ہے۔
-- borrower_id کسی ایک میز سے جڑا نہیں — وہ طالبہ، استاد یا عملے
-- میں سے کسی کا بھی ہو سکتا ہے، اس لیے اس پر FK نہیں ہے؛
-- درستی سرور ایکشن میں جانچی جاتی ہے۔
-- ============================================================

-- 1) دینے/واپسی کی میز
create table if not exists public.library_issues (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  book_id uuid not null references public.library_books (id),
  borrower_type text not null check (borrower_type in ('student', 'teacher', 'staff')),
  borrower_id uuid not null,
  issued_at date not null default CURRENT_DATE,
  due_date date,
  returned_at timestamptz,
  status text not null default 'issued'
    check (status in ('issued', 'returned')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.library_issues enable row level security;

-- 3) پالیسیاں — صرف اپنے مدرسے کا ریکارڈ
drop policy if exists "own madrasa library_issues read" on public.library_issues;
create policy "own madrasa library_issues read"
  on public.library_issues for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa library_issues insert" on public.library_issues;
create policy "own madrasa library_issues insert"
  on public.library_issues for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa library_issues update" on public.library_issues;
create policy "own madrasa library_issues update"
  on public.library_issues for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — دینے/واپسی کا ریکارڈ حذف نہیں ہوتا۔
