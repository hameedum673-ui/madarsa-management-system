-- ============================================================
-- مرحلہ 3 — بنیادی میزیں + Row Level Security (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
-- ترتیب: پہلے یہ فائل چلائیں، پھر پہلا مدرسہ اور پہلا منتظم (admin) بنائیں۔
-- نوٹ: پہلا مدرسہ اور پہلا صارف SQL Editor سے بنائے جائیں گے،
-- کیونکہ SQL Editor postgres کردار سے چلتا ہے اور RLS سے بالاتر ہوتا ہے۔
-- ایپ سے ہونے والا ہر کام نیچے دی گئی پالیسیوں کے تابع ہوگا۔
-- ============================================================

-- 1) مدارس — ہر مدرسہ ایک Tenant
create table if not exists public.madrasas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2) صارفین — Supabase Auth کے ہر صارف کا ایک profile
--    ہر صارف صرف ایک مدرسے سے جڑا ہوتا ہے — یہی علیحدگی کی بنیاد ہے۔
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  madrasa_id uuid not null references public.madrasas (id),
  name text not null,
  role text not null check (role in (
    'super_admin', 'mohtamim', 'nazim_taleemat',
    'muhasib', 'mudarris', 'clerk'
  )),
  created_at timestamptz not null default now()
);

-- 3) آڈٹ لاگ — اہم کاموں کا ریکارڈ (کون، کب، کیا)
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  user_id uuid references auth.users (id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4) مددگار فنکشن — لاگ اِن صارف کے مدرسے کی شناخت
--    SECURITY DEFINER اس لیے ہے تاکہ پالیسیاں profiles کو پڑھتے وقت
--    ایک دوسرے کے اندر نہ پھنسیں (recursion سے بچاؤ)۔
create or replace function public.my_madrasa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select madrasa_id from public.profiles where id = auth.uid()
$$;

-- 5) Row Level Security آن کریں
alter table public.madrasas enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- 6) پالیسیاں — ہر صارف صرف اپنے مدرسے کا ڈیٹا دیکھ/لکھ سکے
--    مدرسہ: صرف اپنا مدرسہ دیکھ سکتے ہیں
drop policy if exists "own madrasa read" on public.madrasas;
create policy "own madrasa read"
  on public.madrasas for select
  to authenticated
  using (id = public.my_madrasa_id());

--    صارفین: صرف اپنے مدرسے کے صارفین دیکھ سکتے ہیں
drop policy if exists "own madrasa profiles read" on public.profiles;
create policy "own madrasa profiles read"
  on public.profiles for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

--    آڈٹ لاگ: صرف اپنے مدرسے کا لاگ دیکھ سکتے ہیں
drop policy if exists "own madrasa audit read" on public.audit_log;
create policy "own madrasa audit read"
  on public.audit_log for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

--    آڈٹ لاگ: نیا اندراج صرف اپنے مدرسے کے لیے
drop policy if exists "own madrasa audit insert" on public.audit_log;
create policy "own madrasa audit insert"
  on public.audit_log for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

-- نوٹ: اس مرحلے میں ایپ سے INSERT/UPDATE/DELETE کی اجازت صرف audit_log
-- (insert) تک محدود ہے۔ مدرسے اور صارفین بنانا اگلے مرحلے کا کام ہے۔
