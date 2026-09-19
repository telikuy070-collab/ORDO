-- 001_import_export.sql
-- Import/export module: jobs, mappings, and RLS policies.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

create extension if not exists "uuid-ossp";

-- Tenants (referenced by every tenant-scoped table).
create table if not exists public.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Import jobs (schedule import from Excel/CSV).
create table if not exists public.import_jobs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  file_name text not null,
  file_size integer,
  format text not null check (format in ('xlsx', 'csv')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  total_rows integer,
  processed_rows integer default 0,
  mapping_id uuid references public.mappings(id) on delete set null,
  created_by uuid references public.auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Export jobs (schedule export to Excel/CSV/JSON).
create table if not exists public.export_jobs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  format text not null check (format in ('xlsx', 'csv', 'json')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  entity text not null check (entity in ('schedule', 'teachers', 'groups', 'rooms')),
  filter jsonb default '{}',
  file_path text,
  file_size integer,
  created_by uuid references public.auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Field mappings (source field -> target field) for import jobs.
create table if not exists public.mappings (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  fields jsonb not null default '[]',
  created_by uuid references public.auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

-- Indexes on tenant_id and foreign keys (AGENTS.md §5).
create index if not exists import_jobs_tenant_idx on public.import_jobs (tenant_id);
create index if not exists import_jobs_status_idx on public.import_jobs (tenant_id, status);
create index if not exists export_jobs_tenant_idx on public.export_jobs (tenant_id);
create index if not exists export_jobs_status_idx on public.export_jobs (tenant_id, status);
create index if not exists mappings_tenant_idx on public.mappings (tenant_id);

-- Updated-at trigger helper.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  foreach t in array array['import_jobs', 'export_jobs', 'mappings', 'tenants'] loop
    execute format('drop trigger if exists set_updated_at on public.%s; create trigger set_updated_at before update on public.%s for each row execute function public.set_updated_at();', t, t);
  end loop;
end;
$$;

-- RLS: every table is tenant-scoped and authenticated users can only see their tenant.
alter table public.import_jobs enable row level security;
alter table public.export_jobs enable row level security;
alter table public.mappings enable row level security;
alter table public.tenants enable row level security;

create policy "import_jobs_tenant_isolation" on public.import_jobs
  for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "export_jobs_tenant_isolation" on public.export_jobs
  for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "mappings_tenant_isolation" on public.mappings
  for all
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());

create policy "tenants_self_isolation" on public.tenants
  for select
  using (id = public.current_tenant_id());

-- Helper: returns the tenant_id for the current authenticated user.
-- Set by the application (e.g. via a custom JWT claim or a user_settings table).
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select null::uuid
$$;