-- ============================================================
-- تعلیمی سال کی بنیاد — academic_years + enrollments
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 055 چل چکی ہوں، پھر یہ فائل چلائیں۔
--
-- سال ہجری ہے: نیا سال 10 شوال سے شروع (عید الفطر کے بعد، اسی دن
-- سے داخلے)، سال رجب کے آخر تک؛ شعبان + رمضان چھٹیاں۔ سال کا لیبل
-- اس کے شوال والا ہجری سال (جیسے "1447ھ")۔ شروع/ختم کی تاریخیں
-- عیسوی تاریخ کے طور پر محفوظ ہوتی ہیں — سال بناتے وقت مالک 10
-- شوال کی عیسوی تاریخ خود لکھتا ہے (نظام ہجری حساب نہیں لگاتا)۔
-- enrollments: ہر طالبہ، ہر سال، ایک قطار — تاکہ سالوں بعد بھی
-- دیکھا جا سکے کہ کس سال کس جماعت میں کون تھا اور کتنی تھیں۔
-- ============================================================

-- 1) تعلیمی سال — ہر مدرسے کا ہر سال
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  label text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  unique (madrasa_id, label)
);

-- 2) سال وار داخلہ — ہر طالبہ، ہر سال، ایک قطار
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid not null references public.students (id) on delete cascade,
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  class_name text,
  department text,
  section text,
  status text not null default 'active' check (status in ('active', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  unique (student_id, academic_year_id)
);

-- 3) Row Level Security آن کریں
alter table public.academic_years enable row level security;
alter table public.enrollments enable row level security;

-- 4) پالیسیاں — صرف اپنے مدرسے کا ریکارڈ (طلبہ والی میز جیسی)
drop policy if exists "own madrasa academic_years read" on public.academic_years;
create policy "own madrasa academic_years read"
  on public.academic_years for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa academic_years insert" on public.academic_years;
create policy "own madrasa academic_years insert"
  on public.academic_years for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa academic_years update" on public.academic_years;
create policy "own madrasa academic_years update"
  on public.academic_years for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa enrollments read" on public.enrollments;
create policy "own madrasa enrollments read"
  on public.enrollments for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa enrollments insert" on public.enrollments;
create policy "own madrasa enrollments insert"
  on public.enrollments for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa enrollments update" on public.enrollments;
create policy "own madrasa enrollments update"
  on public.enrollments for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — سال اور داخلے کا ریکارڈ کبھی حذف نہیں ہوتا۔
