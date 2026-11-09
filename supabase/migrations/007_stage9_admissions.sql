-- ============================================================
-- مرحلہ 9 — نئے داخلوں کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 تا 006 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- ============================================================

-- 1) داخلے کی درخواستیں — ہر درخواست زیرِ غور، منظور یا مسترد ہوتی ہے
--    منظور ہونے پر اس سے طالبہ کا ریکارڈ بنتا ہے اور student_id سے جڑ جاتا ہے۔
create table if not exists public.admissions (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid references public.students (id),
  applicant_name text not null,
  father_name text not null,
  guardian_name text,
  guardian_phone text,
  date_of_birth date,
  department text not null check (department in ('hifz', 'nazira', 'dars_e_nizami')),
  class_name text,
  admission_date date not null default CURRENT_DATE,
  previous_madrasa text,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.admissions enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کے داخلے دیکھ/لکھ سکے
drop policy if exists "own madrasa admissions read" on public.admissions;
create policy "own madrasa admissions read"
  on public.admissions for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa admissions insert" on public.admissions;
create policy "own madrasa admissions insert"
  on public.admissions for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa admissions update" on public.admissions;
create policy "own madrasa admissions update"
  on public.admissions for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — داخلے کا ریکارڈ کبھی حذف نہیں ہوتا؛
-- غلط درخواست «مسترد» کی جاتی ہے، ریکارڈ رہتا ہے۔
