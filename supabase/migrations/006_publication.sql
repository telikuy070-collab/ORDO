-- 006_publication.sql
-- Publication module: published_schedules, notifications, subscriptions.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Published schedules (опубликованные расписания).
create table if not exists public.published_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  schedule_version_id uuid not null references public.schedule_versions(id) on delete cascade,
  published_at timestamptz not null default now(),
  published_by uuid not null references auth.users(id) on delete cascade,
  unique (schedule_version_id)
);

-- Notifications (уведомления).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('schedule_published', 'schedule_changed', 'lesson_cancelled', 'lesson_moved', 'teacher_assigned')),
  payload jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'sent', 'read')),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- Subscriptions (подписки на каналы уведомлений).
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('push', 'email', 'telegram')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel)
);

-- Indexes.
create index if not exists published_schedules_tenant_idx on public.published_schedules (tenant_id);
create index if not exists published_schedules_version_idx on public.published_schedules (schedule_version_id);
create index if not exists notifications_tenant_idx on public.notifications (tenant_id);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id);
create index if not exists notifications_status_idx on public.notifications (status);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id);

-- Updated-at triggers.
create trigger set_updated_at before update on public.published_schedules for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

-- RLS.
alter table public.published_schedules enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;

create policy "published_schedules_tenant_isolation" on public.published_schedules
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "notifications_tenant_isolation" on public.notifications
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "subscriptions_user_isolation" on public.subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());