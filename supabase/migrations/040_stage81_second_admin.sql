-- مرحلہ 81 — دوسرا ایڈمن (backup admin)
-- پہلا ایڈمن = سب سے پرانی super_admin پروفائل (created_at، برابر ہو تو id)۔
-- ترقی کوئی بھی super_admin کر سکتا ہے؛ تنزلی صرف پہلا ایڈمن، اور پہلے
-- ایڈمن کو کوئی بھی نہیں ہٹا سکتا (نہ دوسرا ایڈمن، نہ وہ خود)۔
-- جانچ SQL میں ہے (SECURITY DEFINER) تاکہ بٹن کو بائی پاس کر کے بھی
-- تنزلی نہ ہو سکے۔

create or replace function public.am_i_primary_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'super_admin'
      and not exists (
        select 1
        from public.profiles q
        where q.role = 'super_admin'
          and (q.created_at < p.created_at
            or (q.created_at = p.created_at and q.id < p.id))
      )
  );
$$;

create or replace function public.set_user_role(p_approved_user_id uuid, p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.approved_users%rowtype;
  v_profile public.profiles%rowtype;
  v_is_admin boolean;
  v_is_primary boolean;
  v_target_is_primary boolean;
begin
  -- بلانے والا super_admin ہونا چاہیے
  v_is_admin := public.is_app_admin();
  if not v_is_admin then
    return false;
  end if;

  -- کردار چھ میں سے ایک ہونا چاہیے
  if p_role not in ('super_admin', 'mohtamim', 'nazim_taleemat', 'muhasib', 'mudarris', 'clerk') then
    return false;
  end if;

  select * into v_row from public.approved_users where id = p_approved_user_id;
  if not found then
    return false;
  end if;
  -- صرف منظور شدہ صارف کا کردار بدلا جا سکتا ہے
  if v_row.status <> 'approved' then
    return false;
  end if;
  -- کردار پہلے سے وہی ہو تو کچھ نہیں کرنا
  if v_row.assigned_role = p_role then
    return true;
  end if;

  -- ہدف کی پروفائل (ہو تو) — تنزلی کی جانچ کے لیے
  select * into v_profile from public.profiles
  where madrasa_id = v_row.assigned_madrasa_id;

  -- تنزلی ہو (پرانا کردار super_admin، نیا کوئی اور) تو صرف پہلا ایڈمن
  -- کر سکتا ہے، اور پہلے ایڈمن کو کوئی نہیں ہٹا سکتا
  if v_row.assigned_role = 'super_admin' and p_role <> 'super_admin' then
    v_is_primary := public.am_i_primary_admin();
    if not v_is_primary then
      return false;
    end if;
    v_target_is_primary := exists (
      select 1 from public.profiles q
      where q.role = 'super_admin'
        and q.id = v_profile.id
        and not exists (
          select 1 from public.profiles r
          where r.role = 'super_admin'
            and (r.created_at < q.created_at
              or (r.created_at = q.created_at and r.id < q.id))
        )
    );
    if v_target_is_primary then
      return false;
    end if;
  end if;

  update public.approved_users
  set assigned_role = p_role, updated_at = now()
  where id = p_approved_user_id;

  if v_profile.id is not null then
    update public.profiles set role = p_role where id = v_profile.id;
  end if;

  return true;
end;
$$;
