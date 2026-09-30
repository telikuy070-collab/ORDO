-- 007_analytics.sql
-- Analytics module: workload_reports, teacher_loads, group_loads.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Workload reports (отчёты о нагрузке).
create table if not exists public.workload_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  total_hours integer not null default 0,
  lecture_hours integer not null default 0,
  practice_hours integer not null default 0,
  generated_at timestamptz not null default now()
);

-- Teacher loads (нагрузка преподавателей).
create table if not exists public.teacher_loads (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  hours integer not null default 0,
  week_load integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, discipline_id)
);

-- Group loads (нагрузка групп).
create table if not exists public.group_loads (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  hours integer not null default 0,
  week_load integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, discipline_id)
);

-- Indexes.
create index if not exists workload_reports_tenant_idx on public.workload_reports (tenant_id);
create index if not exists workload_reports_teacher_idx on public.workload_reports (teacher_id);
create index if not exists workload_reports_semester_idx on public.workload_reports (semester_id);
create index if not exists teacher_loads_teacher_idx on public.teacher_loads (teacher_id);
create index if not exists group_loads_group_idx on public.group_loads (group_id);

-- Updated-at triggers.
create trigger set_updated_at before update on public.teacher_loads for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.group_loads for each row execute function public.set_updated_at();

-- RLS.
alter table public.workload_reports enable row level security;
alter table public.teacher_loads enable row level security;
alter table public.group_loads enable row level security;

create policy "workload_reports_tenant_isolation" on public.workload_reports
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "teacher_loads_tenant_isolation" on public.teacher_loads
  for all using (teacher_id in (select id from public.teachers where tenant_id = public.current_tenant_id()))
  with check (teacher_id in (select id from public.teachers where tenant_id = public.current_tenant_id()));

create policy "group_loads_tenant_isolation" on public.group_loads
  for all using (group_id in (select id from public.groups where tenant_id = public.current_tenant_id()))
  with check (group_id in (select id from public.groups where tenant_id = public.current_tenant_id()));