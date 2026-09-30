-- 005_scheduling.sql
-- Scheduling module: schedules, schedule_versions, lessons, conflicts, constraints.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Schedules (расписания).
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  semester_id uuid not null references public.semesters(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (tenant_id, semester_id)
);

-- Schedule versions (версии расписания).
create table if not exists public.schedule_versions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  version_number integer not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  comment text,
  created_at timestamptz not null default now(),
  unique (schedule_id, version_number)
);

-- Lessons (пары).
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.schedule_versions(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  subgroup_ids uuid[] not null default '{}',
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  pair_number integer not null check (pair_number > 0),
  time_start time not null,
  time_end time not null,
  week_type text not null check (week_type in ('all', 'odd', 'even')),
  lesson_type text not null check (lesson_type in ('lecture', 'practice', 'seminar', 'lab')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conflicts (конфликты).
create table if not exists public.conflicts (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.schedule_versions(id) on delete cascade,
  type text not null check (type in ('teacher_double_booked', 'group_double_booked', 'room_double_booked', 'teacher_preference_violated', 'constraint_violated')),
  severity text not null check (severity in ('hard', 'soft')),
  lesson_ids uuid[] not null default '{}',
  description text not null,
  created_at timestamptz not null default now()
);

-- Constraints (ограничения).
create table if not exists public.constraints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  type text not null,
  severity text not null check (severity in ('hard', 'soft')),
  rule jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes.
create index if not exists schedules_tenant_idx on public.schedules (tenant_id);
create index if not exists schedules_semester_idx on public.schedules (semester_id);
create index if not exists schedule_versions_schedule_idx on public.schedule_versions (schedule_id);
create index if not exists lessons_version_idx on public.lessons (version_id);
create index if not exists lessons_teacher_idx on public.lessons (teacher_id);
create index if not exists lessons_group_idx on public.lessons (group_id);
create index if not exists lessons_room_idx on public.lessons (room_id);
create index if not exists conflicts_version_idx on public.conflicts (version_id);
create index if not exists constraints_tenant_idx on public.constraints (tenant_id);

-- Updated-at triggers.
create trigger set_updated_at before update on public.schedules for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.constraints for each row execute function public.set_updated_at();

-- RLS.
alter table public.schedules enable row level security;
alter table public.schedule_versions enable row level security;
alter table public.lessons enable row level security;
alter table public.conflicts enable row level security;
alter table public.constraints enable row level security;

create policy "schedules_tenant_isolation" on public.schedules
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "schedule_versions_tenant_isolation" on public.schedule_versions
  for all using (schedule_id in (select id from public.schedules where tenant_id = public.current_tenant_id()))
  with check (schedule_id in (select id from public.schedules where tenant_id = public.current_tenant_id()));

create policy "lessons_tenant_isolation" on public.lessons
  for all using (version_id in (select id from public.schedule_versions where schedule_id in (select id from public.schedules where tenant_id = public.current_tenant_id())))
  with check (version_id in (select id from public.schedule_versions where schedule_id in (select id from public.schedules where tenant_id = public.current_tenant_id())));

create policy "conflicts_tenant_isolation" on public.conflicts
  for all using (version_id in (select id from public.schedule_versions where schedule_id in (select id from public.schedules where tenant_id = public.current_tenant_id())))
  with check (version_id in (select id from public.schedule_versions where schedule_id in (select id from public.schedules where tenant_id = public.current_tenant_id())));

create policy "constraints_tenant_isolation" on public.constraints
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());