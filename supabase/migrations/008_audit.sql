-- 008_audit.sql
-- Audit module: audit_events, change_logs.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Audit events (события аудита).
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('create', 'update', 'delete', 'publish')),
  entity text not null,
  entity_id uuid not null,
  before jsonb not null default '{}',
  after jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Change logs (лог изменений версий расписания).
create table if not exists public.change_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version_id uuid not null references public.schedule_versions(id) on delete cascade,
  changes jsonb[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Indexes.
create index if not exists audit_events_tenant_idx on public.audit_events (tenant_id);
create index if not exists audit_events_user_idx on public.audit_events (user_id);
create index if not exists audit_events_entity_idx on public.audit_events (entity, entity_id);
create index if not exists audit_events_created_idx on public.audit_events (created_at);
create index if not exists change_logs_tenant_idx on public.change_logs (tenant_id);
create index if not exists change_logs_version_idx on public.change_logs (version_id);

-- RLS.
alter table public.audit_events enable row level security;
alter table public.change_logs enable row level security;

create policy "audit_events_tenant_isolation" on public.audit_events
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "change_logs_tenant_isolation" on public.change_logs
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());