-- ============================================================
-- مرحلہ 6 — طلبہ کی حاضری کی میز + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001، 002 اور 003 چل چکی ہوں، پھر یہ فائل چلائیں۔
-- ============================================================

-- 1) طلبہ کی حاضری — ایک طالبہ کی ایک دن میں صرف ایک حاضری
create table if not exists public.student_attendance (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid not null references public.students (id),
  date date not null,
  status text not null check (status in ('present', 'absent', 'leave', 'late')),
  marked_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, student_id, date)
);

-- 2) Row Level Security آن کریں
alter table public.student_attendance enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی حاضری دیکھ/لکھ سکے
drop policy if exists "own madrasa attendance read" on public.student_attendance;
create policy "own madrasa attendance read"
  on public.student_attendance for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa attendance insert" on public.student_attendance;
create policy "own madrasa attendance insert"
  on public.student_attendance for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa attendance update" on public.student_attendance;
create policy "own madrasa attendance update"
  on public.student_attendance for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — حاضری کا ریکارڈ حذف نہیں ہوتا؛
-- غلطی ہو تو اسی دن کی حاضری دوبارہ لگا کر درست کی جاتی ہے۔
