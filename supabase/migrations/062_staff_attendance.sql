-- ============================================================
-- عملے کی حاضری — staff_attendance
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
--
-- ایک عملے کے رکن کی ایک دن میں صرف ایک حاضری؛ دوبارہ لگانے سے
-- پرانی درست ہوتی ہے (upsert)، نقل نہیں بنتی۔ حالتیں وہی چار ہیں
-- جو طلبہ اور اساتذہ کی حاضری میں ہیں: حاضر/غیر حاضر/رخصت/بیمار۔
--
-- محفوظ ہے: صرف نئی جدول بنتی ہے؛ عملہ، طلبہ یا اساتذہ کی حاضری
-- یا کوئی پرانا ریکارڈ نہیں بدلتا؛ دوبارہ چلانا بھی محفوظ ہے۔
-- ============================================================

-- 1) عملے کی حاضری — ایک عملے کی ایک دن میں صرف ایک حاضری
create table if not exists public.staff_attendance (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  staff_id uuid not null references public.staff (id),
  date date not null,
  status text not null check (status in ('present', 'absent', 'leave', 'sick')),
  marked_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, staff_id, date)
);

-- 2) Row Level Security آن کریں
alter table public.staff_attendance enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی حاضری دیکھ/لکھ سکے
drop policy if exists "own madrasa staff attendance read" on public.staff_attendance;
create policy "own madrasa staff attendance read"
  on public.staff_attendance for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa staff attendance insert" on public.staff_attendance;
create policy "own madrasa staff attendance insert"
  on public.staff_attendance for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa staff attendance update" on public.staff_attendance;
create policy "own madrasa staff attendance update"
  on public.staff_attendance for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — حاضری کبھی حذف نہیں ہوتی،
-- صرف دوبارہ لگا کر درست کی جاتی ہے۔ یہ مرحلہ 1 کا اصول ہے۔
