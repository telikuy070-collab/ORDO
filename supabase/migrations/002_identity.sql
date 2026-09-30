-- 002_identity.sql
-- Identity module: users, roles, user_roles, and RLS policies.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Roles (global, not tenant-scoped).
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- User roles (links auth.users to roles + tenant).
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, role_id, tenant_id)
);

-- Indexes.
create index if not exists user_roles_user_idx on public.user_roles (user_id);
create index if not exists user_roles_tenant_idx on public.user_roles (tenant_id);
create index if not exists user_roles_role_idx on public.user_roles (role_id);

-- Updated-at trigger.
create trigger set_updated_at before update on public.user_roles for each row execute function public.set_updated_at();

-- RLS.
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

create policy "roles_read_all" on public.roles
  for select using (true);

create policy "user_roles_tenant_isolation" on public.user_roles
  for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

-- Helper: returns the tenant_id for the current authenticated user.
-- Reads from user_roles table.
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select tenant_id
  from public.user_roles
  where user_id = auth.uid()
  limit 1
$$;

-- Seed default roles.
insert into public.roles (name, description) values
  ('owner', 'Platform owner - full access'),
  ('tenant_admin', 'Tenant administrator - full access within tenant'),
  ('schedule_owner', 'Schedule owner (vice director) - full schedule access'),
  ('department_head', 'Department head - own department'),
  ('teacher', 'Teacher - own lessons, workload, preferences'),
  ('anon', 'Anonymous student - public schedule only')
on conflict (name) do nothing;