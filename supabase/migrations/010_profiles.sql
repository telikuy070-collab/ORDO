-- 010_profiles.sql
-- Profile table so the browser can read staff identity (email, full name)
-- without touching auth.users, which the anon key cannot access through
-- PostgREST. Tenant binding is derived from user_roles, never from client
-- input, so a user cannot attach themselves to a tenant.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_tenant_id_idx on public.profiles (tenant_id);
create index if not exists profiles_email_idx on public.profiles (lower(email));

-- tenant_id is nullable on purpose: a row exists from the moment the auth
-- user is created, before any role assignment binds it to a tenant.
alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Keep profiles in sync with auth.users
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.handle_new_user();

-- Bind a profile to a tenant the moment a role row is created. The tenant
-- always comes from user_roles, never from the caller, and it may only be set
-- once: a different tenant is a privilege-escalation attempt and aborts.
create or replace function public.handle_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from public.profiles
    where id = new.user_id
      and tenant_id is not null
      and tenant_id <> new.tenant_id
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'profile is already bound to a different tenant';
  end if;

  update public.profiles
  set tenant_id = new.tenant_id,
      updated_at = now()
  where id = new.user_id and tenant_id is distinct from new.tenant_id;

  return new;
end;
$$;

revoke all on function public.handle_role_assignment() from public;
revoke all on function public.handle_role_assignment() from anon;
revoke all on function public.handle_role_assignment() from authenticated;

drop trigger if exists on_user_role_assigned on public.user_roles;
create trigger on_user_role_assigned
  after insert or update of tenant_id on public.user_roles
  for each row execute function public.handle_role_assignment();

-- ---------------------------------------------------------------------------
-- 3. Backfill profiles for auth users that predate this migration
-- ---------------------------------------------------------------------------

insert into public.profiles (id, email, full_name)
select
  u.id,
  coalesce(u.email, ''),
  u.raw_user_meta_data ->> 'full_name'
from auth.users as u
on conflict (id) do nothing;

update public.profiles as p
set tenant_id = sub.tenant_id
from (
  select distinct on (user_id) user_id, tenant_id
  from public.user_roles
  order by user_id, tenant_id
) as sub
where p.id = sub.user_id and p.tenant_id is null;

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

revoke all privileges on table public.profiles from public;
revoke all privileges on table public.profiles from anon;
revoke all privileges on table public.profiles from authenticated;

-- A user may always read their own profile, even before tenant binding.
create policy profiles_self_select
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- A tenant_admin may read the roster of their own tenant.
create policy profiles_tenant_admin_select
on public.profiles
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
);

-- Users may maintain their own display name. email and tenant_id are not
-- updatable from the client, so a user cannot re-address their account or
-- move themselves between tenants.
create policy profiles_self_update
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy profiles_tenant_admin_update
on public.profiles
for update
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
)
with check (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
);

grant select on table public.profiles to authenticated;
-- Column-level grant: only the display name is client-writable. email and
-- tenant_id stay server-controlled so a user cannot re-address their account
-- or move themselves between tenants. A second grant here would union with
-- this one and widen access, so there must stay exactly one.
grant update (full_name) on table public.profiles to authenticated;

-- Keep updated_at current.
drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
