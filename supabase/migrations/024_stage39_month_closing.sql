-- ============================================================
-- مرحلہ 39 — مہینے کی بندش (month_closings) + Row Level Security
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- نوٹ: کوئی مہینہ پہلے سے بند نہیں ہوگا — صارف خود بند کرے گا۔
-- ============================================================

-- 1) مہینے کی بندش — ہر مہینے کی ایک قطار (بند ہے یا کھلا ہے)
create table if not exists public.month_closings (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  month text not null check (month ~ '^[0-9]{4}-[0-9]{2}$'),
  is_closed boolean not null default true,
  closed_by uuid references auth.users (id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, month)
);

-- 2) Row Level Security آن کریں
alter table public.month_closings enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی بندش دیکھ/لکھ سکے
drop policy if exists "own madrasa month_closings read" on public.month_closings;
create policy "own madrasa month_closings read"
  on public.month_closings for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa month_closings insert" on public.month_closings;
create policy "own madrasa month_closings insert"
  on public.month_closings for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa month_closings update" on public.month_closings;
create policy "own madrasa month_closings update"
  on public.month_closings for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — بندش کی قطار کبھی حذف نہیں ہوتی،
-- صرف is_closed بدلا جاتا ہے (بند / دوبارہ کھلا)۔ یہ مرحلہ 1 کا اصول ہے۔
