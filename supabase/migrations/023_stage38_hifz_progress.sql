-- ============================================================
-- مرحلہ 38 — حفظ کی پیش رفت (سبق / سبقی / منزل) + Row Level Security
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- نوٹ: کوئی پرانی پیش رفت نہیں بنے گی — صارف اپنی پیش رفت خود درج کرے گا۔
-- ============================================================

-- 1) حفظ کی پیش رفت — ہر اندراج ایک طالبہ اور ایک تاریخ سے جڑا ہوتا ہے
create table if not exists public.hifz_progress (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  student_id uuid not null references public.students (id),
  progress_date date not null default CURRENT_DATE,
  kind text not null check (kind in ('sabaq', 'sabqi', 'manzil')),
  portion text not null,
  quality text not null default 'good' check (quality in ('excellent', 'good', 'weak')),
  listened_by uuid references public.teachers (id),
  note text,
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Row Level Security آن کریں
alter table public.hifz_progress enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی پیش رفت دیکھ/لکھ سکے
drop policy if exists "own madrasa hifz_progress read" on public.hifz_progress;
create policy "own madrasa hifz_progress read"
  on public.hifz_progress for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa hifz_progress insert" on public.hifz_progress;
create policy "own madrasa hifz_progress insert"
  on public.hifz_progress for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa hifz_progress update" on public.hifz_progress;
create policy "own madrasa hifz_progress update"
  on public.hifz_progress for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — غلط اندراج کبھی حذف نہیں ہوتا،
-- صرف status = 'voided' (منسوخ) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
