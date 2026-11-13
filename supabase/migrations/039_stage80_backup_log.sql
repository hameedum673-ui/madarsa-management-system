-- مرحلہ 80 — بیک اپ ڈاؤن لوڈ کا ریکارڈ (یاددہانی کے لیے)
-- ہر ڈاؤن لوڈ پر ایک قطار: کب، کس نے۔ یہ آپریشنل ریکارڈ ہے —
-- بیک اپ/بحالی کی فہرستوں میں نہیں ڈالا جا رہا۔
-- کوئی UPDATE / DELETE پالیسی نہیں (نہ مٹانے والا اصول)۔
create table if not exists public.backup_log (
  id uuid primary key default gen_random_uuid(),
  madrasa_id uuid not null references public.madrasas(id),
  downloaded_at timestamptz not null default now(),
  downloaded_by uuid
);

alter table public.backup_log enable row level security;

create policy "own madrasa backup log read"
  on public.backup_log for select
  to authenticated
  using (madrasa_id = public.my_madrasa_id());

create policy "own madrasa backup log insert"
  on public.backup_log for insert
  to authenticated
  with check (madrasa_id = public.my_madrasa_id());
