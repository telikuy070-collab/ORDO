-- 004_resources.sql
-- Resources module: teachers, rooms, buildings, teacher_preferences.
-- Every table carries tenant_id (multitenancy) and RLS (AGENTS.md §5).

-- Buildings (корпуса).
create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rooms (аудитории).
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  number text not null,
  capacity integer not null check (capacity > 0),
  type text not null check (type in ('lecture', 'practice', 'lab', 'sport')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teachers (преподаватели).
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  is_active boolean not null default true,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, email)
);

-- Teacher preferences (пожелания преподавателей).
create table if not exists public.teacher_preferences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  type text not null check (type in ('cannot', 'prefer', 'max_per_day')),
  day_of_week integer not null check (day_of_week >= 0 and day_of_week <= 6),
  pair_number integer not null check (pair_number >= 0),
  value jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, type, day_of_week, pair_number)
);

-- Indexes.
create index if not exists buildings_tenant_idx on public.buildings (tenant_id);
create index if not exists rooms_tenant_idx on public.rooms (tenant_id);
create index if not exists rooms_building_idx on public.rooms (building_id);
create index if not exists teachers_tenant_idx on public.teachers (tenant_id);
create index if not exists teachers_user_idx on public.teachers (user_id);
create index if not exists teacher_preferences_teacher_idx on public.teacher_preferences (teacher_id);

-- Updated-at triggers.
create trigger set_updated_at before update on public.buildings for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.rooms for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.teachers for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.teacher_preferences for each row execute function public.set_updated_at();

-- RLS.
alter table public.buildings enable row level security;
alter table public.rooms enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_preferences enable row level security;

create policy "buildings_tenant_isolation" on public.buildings
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "rooms_tenant_isolation" on public.rooms
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "teachers_tenant_isolation" on public.teachers
  for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

create policy "teacher_preferences_tenant_isolation" on public.teacher_preferences
  for all using (teacher_id in (select id from public.teachers where tenant_id = public.current_tenant_id()))
  with check (teacher_id in (select id from public.teachers where tenant_id = public.current_tenant_id()));