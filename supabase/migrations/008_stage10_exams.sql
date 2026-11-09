-- ============================================================
-- مرحلہ 10 — امتحانات اور نتائج کی میزیں + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 007 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- ============================================================

-- 1) امتحان — نام، تاریخ، شعبہ، جماعت اور مضامین کی فہرست
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  name text not null,
  exam_date date not null default CURRENT_DATE,
  department text not null check (department in ('hifz', 'nazira', 'dars_e_nizami')),
  class_name text,
  subjects text[] not null default '{}',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) امتحان کے نتائج — ہر طالبہ کے ہر مضمون کے نمبر (ہر مضمون 100 نمبر کا)
create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  exam_id uuid not null references public.exams (id),
  student_id uuid not null references public.students (id),
  subject text not null,
  marks_obtained integer not null check (marks_obtained >= 0 and marks_obtained <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, exam_id, student_id, subject)
);

-- 3) Row Level Security آن کریں
alter table public.exams enable row level security;
alter table public.exam_results enable row level security;

-- 4) پالیسیاں — ہر صارف صرف اپنے مدرسے کے امتحان اور نتائج دیکھ/لکھ سکے
drop policy if exists "own madrasa exams read" on public.exams;
create policy "own madrasa exams read"
  on public.exams for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa exams insert" on public.exams;
create policy "own madrasa exams insert"
  on public.exams for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa exams update" on public.exams;
create policy "own madrasa exams update"
  on public.exams for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa exam results read" on public.exam_results;
create policy "own madrasa exam results read"
  on public.exam_results for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa exam results insert" on public.exam_results;
create policy "own madrasa exam results insert"
  on public.exam_results for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa exam results update" on public.exam_results;
create policy "own madrasa exam results update"
  on public.exam_results for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — امتحان اور نتائج کبھی حذف نہیں ہوتے؛
-- غلط نمبر دوبارہ لکھ کر درست کیا جاتا ہے۔
