-- ============================================================
-- استاد کو جماعت سونپنا — teacher_classes
-- (Supabase / PostgreSQL)
-- چلانے کی جگہ: Supabase Dashboard → SQL Editor → New query
--
-- استاد اور جماعت کا جوڑ: کون استاد کس جماعت کو کون سا مضمون پڑھاتا ہے۔
-- ایک استاد کئی جماعتیں، ایک جماعت میں کئی استاد (الگ الگ مضمون)۔
-- مضمون خالی بھی ہو سکتا ہے ('') — اسی لیے unique میں subject شامل ہے،
-- تاکہ ایک استاد ایک جماعت میں دو مضمون (جیسے صرف اور نحو) پڑھا سکے۔
--
-- محفوظ ہے: صرف نئی جدول بنتی ہے؛ استاد، جماعت یا کوئی پرانا ریکارڈ
-- نہیں بدلتا؛ دوبارہ چلانا بھی محفوظ ہے۔
-- جوڑ ہٹانا: صرف یہ قطار مٹتی ہے — استاد یا جماعت کا ریکارڈ نہیں مٹتا،
-- اس لیے DELETE کی پالیسی صرف اسی جدول کے لیے ہے۔
-- ============================================================

create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas (id),
  teacher_id uuid not null references public.teachers (id),
  class_id uuid not null references public.classes (id),
  subject text not null default '',
  created_at timestamptz not null default now(),
  unique (madrasa_id, teacher_id, class_id, subject)
);

-- 2) Row Level Security آن کریں
alter table public.teacher_classes enable row level security;

-- 3) پالیسیاں — ہر صارف صرف اپنے مدرسے کے جوڑ دیکھ/لکھ سکے
drop policy if exists "own madrasa teacher classes read" on public.teacher_classes;
create policy "own madrasa teacher classes read"
  on public.teacher_classes for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa teacher classes insert" on public.teacher_classes;
create policy "own madrasa teacher classes insert"
  on public.teacher_classes for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());

drop policy if exists "own madrasa teacher classes delete" on public.teacher_classes;
create policy "own madrasa teacher classes delete"
  on public.teacher_classes for delete
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

-- نوٹ: UPDATE کی کوئی پالیسی نہیں — جوڑ بدلا نہیں جاتا، ہٹا کر نیا بنایا جاتا ہے۔
