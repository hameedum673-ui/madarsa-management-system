-- ============================================================
-- مرحلہ 37 — ماہانہ فیس کا شیڈول + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے migration 001 چل چکی ہو، پھر یہ فائل چلائیں۔
-- نوٹ: کوئی فیس پہلے سے طے نہیں ہوگی — صارف اپنی فیس خود طے کرے گا۔
-- جماعت خالی ('') ہو تو وہ رقم پورے شعبے کی ہوتی ہے؛ کسی جماعت کی
-- الگ رقم ہو تو وہی لگتی ہے، ورنہ شعبے کی رقم لگتی ہے۔
-- ============================================================

-- 1) فیس کا شیڈول — ہر شعبہ / جماعت کی ماہانہ فیس
create table if not exists public.fee_schedule (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  department text not null check (department in ('hifz', 'nazira', 'dars_e_nizami')),
  class_name text not null default '',
  amount integer not null check (amount > 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (madrasa_id, department, class_name)
);

-- 2) Row Level Security آن کریں
alter table public.fee_schedule enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کی فیس دیکھ/لکھ سکے
drop policy if exists "own madrasa fee_schedule read" on public.fee_schedule;
create policy "own madrasa fee_schedule read"
  on public.fee_schedule for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa fee_schedule insert" on public.fee_schedule;
create policy "own madrasa fee_schedule insert"
  on public.fee_schedule for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa fee_schedule update" on public.fee_schedule;
create policy "own madrasa fee_schedule update"
  on public.fee_schedule for update
  to authenticated
  using (madrasa_id = public.my_madrasa_id())
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: DELETE کی کوئی پالیسی نہیں — فیس کا ریکارڈ کبھی حذف نہیں ہوتا،
-- صرف status = 'inactive' (غیر فعال) کیا جاتا ہے۔ یہ مرحلہ 1 کا اصول ہے۔
