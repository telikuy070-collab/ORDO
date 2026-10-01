-- 014_curriculum_plan.sql
-- Curriculum plan (учебный план) storage for imported college workbooks.
--
-- WHY this exists
--   The college keeps its curriculum plan in a workbook, not in Ordo. A sheet
--   is one course plus one semester, and inside it several department blocks
--   each start with a specialty code + name row followed by a group header.
--   A block is the unit a deputy director reasons about: it has its own
--   discipline list, its own weekly load and its own teachers.
--
--   The existing public.curriculum table cannot hold this. It is keyed by
--   (group_id, discipline_id), carries integer hours only, and has no place
--   for the weekly distribution, the activity lines, or the source cell the
--   value came from. The file also mixes two conventions in a single
--   discipline: the first row carries the name, control, credits and lecture
--   hours, and a following row carries only "practice-60" / "seminar-12".
--   Collapsing that into one row would silently drop hours, so every
--   discipline line becomes its own curriculum_items row.
--
--   The workbook is the source of truth, so the raw strings are kept verbatim
--   next to the parsed columns. The group header grammar is not uniform:
--   "ЛД-1-23 (1,2)", "СД-1-2(1)" and "ФЯ-1-2" are all valid, so nothing
--   downstream may assume a fixed shape. raw_group_code and
--   raw_block_header therefore store the exact file text, and intake_year is
--   nullable precisely because some codes carry no intake year.
--
-- TENANT INTEGRITY
--   Every reference between the new tables is a composite (tenant_id, id)
--   foreign key, following 009. A plan can therefore never point at an item,
--   a week, or a department belonging to another college, even if a row is
--   written by a service role.

-- ---------------------------------------------------------------------------
-- 1. Departments (отделения / кафедры)
-- ---------------------------------------------------------------------------
-- The specialty code + name row that opens each block. Kept separate from
-- public.specialties because the workbook treats them as distinct entities:
-- specialties are what a student applies for, departments are what a block is
-- attributed to. A department never has to exist for a group to exist, so the
-- reference from public.groups is nullable and set-null on delete.

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

comment on table public.departments is
  'Departments that curriculum plan blocks are attributed to. Identified by the specialty code printed at the top of a workbook block.';

-- ---------------------------------------------------------------------------
-- 2. Extend public.groups with the curriculum-plan fields
-- ---------------------------------------------------------------------------
-- All three columns are nullable so the rows created by earlier migrations
-- survive untouched. The group header in the file is not reliably parseable
-- into a single shape, so raw_group_code keeps the original string and the
-- parsed parts are best-effort.

alter table public.groups
  add column if not exists department_id uuid references public.departments(id) on delete set null;
alter table public.groups
  add column if not exists intake_year integer check (intake_year between 2000 and 2100);
alter table public.groups
  add column if not exists raw_group_code text;

comment on column public.groups.raw_group_code is
  'Group header exactly as printed in the workbook, never normalised. Some codes omit the intake year and some omit the space before the subgroup bracket.';

-- ---------------------------------------------------------------------------
-- 3. Curriculum plans (учебные планы)
-- ---------------------------------------------------------------------------
-- One row per department block per course per semester. source_row_from
-- anchors the block back to the workbook so an import can be re-run and
-- compared against the file it came from.

create table if not exists public.curriculum_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  semester_id uuid references public.semesters(id) on delete set null,
  course integer not null check (course > 0),
  academic_year text not null,
  weeks_count integer not null default 16 check (weeks_count between 1 and 60),
  source_file_name text not null,
  -- Not null with an empty default: the uniqueness key includes this column,
  -- and Postgres treats NULLs as distinct in a unique index, so a NULL sheet
  -- name would let the same file and row be imported repeatedly.
  source_sheet_name text not null default '',
  source_row_from integer,
  source_row_to integer,
  raw_block_header text not null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'applied', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, source_file_name, source_sheet_name, source_row_from)
);

comment on table public.curriculum_plans is
  'One imported curriculum plan section: a department block of a workbook for one course and one academic year. The workbook remains the source of truth.';

comment on column public.curriculum_plans.raw_block_header is
  'Block header row exactly as printed in the workbook, including any subgroup list.';
comment on column public.curriculum_plans.status is
  'draft while being corrected, ready once approved, applied once it has produced a schedule, rejected when abandoned.';

-- ---------------------------------------------------------------------------
-- 4. Curriculum items (дисциплины и виды занятий)
-- ---------------------------------------------------------------------------
-- One row per discipline line, not per discipline. The workbook writes a
-- discipline across two rows: the first carries the name, control type,
-- credits and lecture hours, and a following row carries only
-- "practice-60" or "seminar-12" with a blank name. Storing one row per line
-- maps that onto the table without merging values that were never on the
-- same row.
--
-- subject_name is not null, so a continuation line inherits the subject name
-- of the line above it at import time; activity_type records which line it
-- was. Block total rows ("Жалпы саат:") are not subjects and are not
-- imported.

create table if not exists public.curriculum_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  plan_id uuid not null references public.curriculum_plans(id) on delete cascade,
  discipline_id uuid references public.disciplines(id) on delete set null,
  subject_name text not null,
  control_type text,
  credits numeric(4,1) check (credits is null or credits >= 0),
  activity_type text check (activity_type in ('lecture', 'practice', 'seminar', 'lab', 'other')),
  lecture_hours numeric(5,1) check (lecture_hours is null or lecture_hours >= 0),
  practice_hours numeric(5,1) check (practice_hours is null or practice_hours >= 0),
  total_hours numeric(5,1) check (total_hours is null or total_hours >= 0),
  sequence_no integer,
  notes text,
  teacher_raw text,
  room_raw text,
  group_code_raw text,
  source_row integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, source_row)
);

comment on table public.curriculum_items is
  'One discipline line of an imported curriculum plan. A subject and each of its activity lines are separate rows so the workbook two-row pattern maps without merging.';

comment on column public.curriculum_items.notes is
  'The packed free-text cell of the workbook, verbatim. Contains the lesson type, building and room, teacher name, group code and subgroup list in one string.';
comment on column public.curriculum_items.teacher_raw is
  'Teacher name extracted from the packed cell. Nullable: a vacancy is written in the same cell and the name is absent.';
comment on column public.curriculum_items.room_raw is
  'Building and room extracted from the packed cell, kept unparsed.';
comment on column public.curriculum_items.group_code_raw is
  'Group code and subgroup list extracted from the packed cell, kept unparsed.';

-- ---------------------------------------------------------------------------
-- 5. Curriculum item weeks (распределение по неделям)
-- ---------------------------------------------------------------------------
-- Columns H..W of the workbook: one row per weekly column. Those cells hold
-- either a number of hours or the non-numeric marker "П", so hours and
-- marker are independent nullable columns rather than a single overloaded
-- column.

create table if not exists public.curriculum_item_weeks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  item_id uuid not null references public.curriculum_items(id) on delete cascade,
  week_no integer not null check (week_no > 0),
  week_start date,
  week_end date,
  hours numeric(4,1) check (hours is null or hours >= 0),
  marker text,
  unique (item_id, week_no)
);

comment on table public.curriculum_item_weeks is
  'Weekly load of a curriculum item, one row per weekly column of the workbook. Holds either hours or the non-numeric "П" marker.';

comment on column public.curriculum_item_weeks.marker is
  'Non-numeric weekly token such as "П", stored verbatim. The workbook mixes it with numbers in the same column.';

-- ---------------------------------------------------------------------------
-- 6. Composite tenant keys
-- ---------------------------------------------------------------------------
-- Same pattern as 009: tenant_id becomes part of every reference between the
-- new tables, so a cross-tenant reference is rejected by the database rather
-- than by policy. curriculum_items needs its own (tenant_id, id) key because
-- curriculum_item_weeks references it.

alter table public.departments
  add constraint departments_tenant_id_id_key unique (tenant_id, id);
alter table public.curriculum_plans
  add constraint curriculum_plans_tenant_id_id_key unique (tenant_id, id);
alter table public.curriculum_items
  add constraint curriculum_items_tenant_id_id_key unique (tenant_id, id);

-- Nullable references are set-null so a group, plan or item outlives the
-- master data it points at. PostgreSQL 15+ column-list SET NULL keeps
-- tenant_id intact, which a bare SET NULL would try to null as well.
alter table public.groups
  add constraint groups_tenant_department_fkey
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id)
  on delete set null (department_id);
alter table public.curriculum_plans
  add constraint curriculum_plans_tenant_department_fkey
  foreign key (tenant_id, department_id) references public.departments(tenant_id, id)
  on delete set null (department_id);
alter table public.curriculum_plans
  add constraint curriculum_plans_tenant_semester_fkey
  foreign key (tenant_id, semester_id) references public.semesters(tenant_id, id)
  on delete set null (semester_id);
alter table public.curriculum_items
  add constraint curriculum_items_tenant_plan_fkey
  foreign key (tenant_id, plan_id) references public.curriculum_plans(tenant_id, id)
  on delete cascade;
alter table public.curriculum_items
  add constraint curriculum_items_tenant_discipline_fkey
  foreign key (tenant_id, discipline_id) references public.disciplines(tenant_id, id)
  on delete set null (discipline_id);
alter table public.curriculum_item_weeks
  add constraint curriculum_item_weeks_tenant_item_fkey
  foreign key (tenant_id, item_id) references public.curriculum_items(tenant_id, id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- 7. Indexes
-- ---------------------------------------------------------------------------

create index if not exists groups_department_idx on public.groups (tenant_id, department_id);
create index if not exists curriculum_items_plan_idx on public.curriculum_items (plan_id, source_row);

-- Every scoped policy filters on tenant_id, so each of these tables needs a
-- tenant-leading index. curriculum_items already has one leading with plan_id,
-- which serves the plan lookup but not a tenant-wide scan.
create index if not exists curriculum_items_tenant_idx on public.curriculum_items (tenant_id);
create index if not exists curriculum_item_weeks_tenant_idx on public.curriculum_item_weeks (tenant_id);
create index if not exists curriculum_item_weeks_item_idx on public.curriculum_item_weeks (item_id, week_no);

-- ---------------------------------------------------------------------------
-- 8. Updated-at triggers
-- ---------------------------------------------------------------------------
-- curriculum_item_weeks has no updated_at and therefore no trigger.

drop trigger if exists set_updated_at on public.departments;
create trigger set_updated_at
  before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.curriculum_plans;
create trigger set_updated_at
  before update on public.curriculum_plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.curriculum_items;
create trigger set_updated_at
  before update on public.curriculum_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. RLS
-- ---------------------------------------------------------------------------
-- Every authenticated member of the tenant reads. Writes are restricted to
-- tenant_admin and schedule_owner through the 009 capability functions.
-- departments is master data and uses can_write_master_data() alone; a plan
-- and the rows derived from it are also schedule input, so they accept
-- can_write_schedules() as well. The two functions currently resolve to the
-- same roles, but keeping both calls means a future divergence between
-- "owns the curriculum" and "owns the timetable" does not silently lock a
-- deputy director out of the plan they uploaded.

alter table public.departments enable row level security;
alter table public.curriculum_plans enable row level security;
alter table public.curriculum_items enable row level security;
alter table public.curriculum_item_weeks enable row level security;

create policy departments_tenant_select
on public.departments
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy departments_master_insert
on public.departments
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and public.can_write_master_data()
  );

create policy departments_master_update
on public.departments
  for update
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.can_write_master_data()
  )
  with check (
    tenant_id = public.current_tenant_id()
    and public.can_write_master_data()
  );

create policy departments_master_delete
on public.departments
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and public.can_write_master_data()
  );

create policy curriculum_plans_tenant_select
on public.curriculum_plans
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy curriculum_plans_write_insert
on public.curriculum_plans
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_plans_write_update
on public.curriculum_plans
  for update
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_plans_write_delete
on public.curriculum_plans
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_items_tenant_select
on public.curriculum_items
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy curriculum_items_write_insert
on public.curriculum_items
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_items_write_update
on public.curriculum_items
  for update
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_items_write_delete
on public.curriculum_items
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_item_weeks_tenant_select
on public.curriculum_item_weeks
  for select
  to authenticated
  using (tenant_id = public.current_tenant_id());

create policy curriculum_item_weeks_write_insert
on public.curriculum_item_weeks
  for insert
  to authenticated
  with check (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_item_weeks_write_update
on public.curriculum_item_weeks
  for update
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  )
  with check (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

create policy curriculum_item_weeks_write_delete
on public.curriculum_item_weeks
  for delete
  to authenticated
  using (
    tenant_id = public.current_tenant_id()
    and (public.can_write_master_data() or public.can_write_schedules())
  );

-- ---------------------------------------------------------------------------
-- 10. Privileges
-- ---------------------------------------------------------------------------
-- Least privilege as in 009/010: the student app reaches the published
-- schedule through public.get_published_schedule(text) only, so anon gets no
-- grant here. The revokes also clear the Supabase default privileges that
-- would otherwise hand these tables to anon and authenticated implicitly.

revoke all on table public.departments from public;
revoke all on table public.departments from anon;
revoke all on table public.departments from authenticated;
revoke all on table public.curriculum_plans from public;
revoke all on table public.curriculum_plans from anon;
revoke all on table public.curriculum_plans from authenticated;
revoke all on table public.curriculum_items from public;
revoke all on table public.curriculum_items from anon;
revoke all on table public.curriculum_items from authenticated;
revoke all on table public.curriculum_item_weeks from public;
revoke all on table public.curriculum_item_weeks from anon;
revoke all on table public.curriculum_item_weeks from authenticated;

grant select, insert, update, delete on table public.departments to authenticated;
grant select, insert, update, delete on table public.curriculum_plans to authenticated;
grant select, insert, update, delete on table public.curriculum_items to authenticated;
grant select, insert, update, delete on table public.curriculum_item_weeks to authenticated;
