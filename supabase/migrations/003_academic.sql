-- 003_academic.sql
-- Academic module: specialties, groups, subgroups, semesters, disciplines, curriculum.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Specialties (специальности).
create table if not exists public.specialties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

-- Groups (учебные группы).
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  code text not null,
  course integer not null check (course > 0),
  semester_number integer not null check (semester_number > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

-- Subgroups (подгруппы).
create table if not exists public.subgroups (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  number integer not null check (number > 0),
  name text,
  created_at timestamptz not null default now(),
  unique (group_id, number)
);

-- Semesters (семестры).
create table if not exists public.semesters (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  number integer not null check (number > 0),
  start_date date not null,
  end_date date not null,
  weeks_count integer not null check (weeks_count > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);

-- Disciplines (дисциплины).
create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  type text not null check (type in ('lecture', 'practice', 'seminar', 'lab')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Curriculum (учебный план).
create table if not exists public.curriculum (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  credits integer not null default 0,
  lecture_hours integer not null default 0,
  practice_hours integer not null default 0,
  total_hours integer not null default 0,
  control_type text not null,
  weekly_load integer[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, discipline_id)
);

-- Indexes.
create index if not exists specialties_tenant_idx on public.specialties (tenant_id);
create index if not exists groups_tenant_idx on public.groups (tenant_id);
create index if not exists groups_specialty_idx on public.groups (specialty_id);
create index if not exists subgroups_group_idx on public.subgroups (group_id);
create index if not exists semesters_tenant_idx on public.semesters (tenant_id);
create index if not exists disciplines_tenant_idx on public.disciplines (tenant_id);
create index if not exists curriculum_group_idx on public.curriculum (group_id);
create index if not exists curriculum_discipline_idx on public.curriculum (discipline_id);

-- Updated-at triggers.
create trigger set_updated_at before update on public.specialties for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.groups for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.semesters for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.disciplines for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.curriculum for each row execute function public.set_updated_at();

-- RLS.
alter table public.specialties enable row level security;
alter table public.groups enable row level security;
alter table public.subgroups enable row level security;
alter table public.semesters enable row level security;
alter table public.disciplines enable row level security;
alter table public.curriculum enable row level security;

create policy "specialties_tenant_isolation" on public.specialties
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "groups_tenant_isolation" on public.groups
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "subgroups_tenant_isolation" on public.subgroups
  for all using (group_id in (select id from public.groups where tenant_id = public.current_tenant_id()))
  with check (group_id in (select id from public.groups where tenant_id = public.current_tenant_id()));

create policy "semesters_tenant_isolation" on public.semesters
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "disciplines_tenant_isolation" on public.disciplines
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "curriculum_tenant_isolation" on public.curriculum
  for all using (group_id in (select id from public.groups where tenant_id = public.current_tenant_id()))
  with check (group_id in (select id from public.groups where tenant_id = public.current_tenant_id()));