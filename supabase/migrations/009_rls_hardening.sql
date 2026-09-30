-- 009_rls_hardening.sql
-- Fail-closed tenant isolation, composite tenant integrity, and least-privilege RLS.

-- ---------------------------------------------------------------------------
-- 1. Repair trigger targets that exist on the already-applied lineage.
-- ---------------------------------------------------------------------------
-- Migrations 002 and 006 create set_updated_at triggers on user_roles,
-- published_schedules and subscriptions, but the applied schema never had the
-- matching updated_at columns. Adding them here repairs the live triggers
-- without rewriting already-applied migration files.

alter table public.user_roles
  add column if not exists updated_at timestamptz not null default now();

alter table public.published_schedules
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2. Add direct tenant ownership to inherited tables.
-- ---------------------------------------------------------------------------

alter table public.subgroups add column if not exists tenant_id uuid;
alter table public.curriculum add column if not exists tenant_id uuid;
alter table public.teacher_preferences add column if not exists tenant_id uuid;
alter table public.schedule_versions add column if not exists tenant_id uuid;
alter table public.lessons add column if not exists tenant_id uuid;
alter table public.conflicts add column if not exists tenant_id uuid;
alter table public.subscriptions add column if not exists tenant_id uuid;
alter table public.teacher_loads add column if not exists tenant_id uuid;
alter table public.group_loads add column if not exists tenant_id uuid;

-- Reject unresolved, ambiguous, or already cross-tenant data before backfill.
-- Existing cross-tenant values are never silently repaired.
do $$
begin
  if exists (
    select 1
    from public.subgroups as subgroup
    left join public.groups as study_group on study_group.id = subgroup.group_id
    where study_group.id is null
       or (subgroup.tenant_id is not null and subgroup.tenant_id <> study_group.tenant_id)
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.subgroups: unresolved or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.curriculum as curriculum_row
    left join public.groups as study_group on study_group.id = curriculum_row.group_id
    left join public.disciplines as discipline on discipline.id = curriculum_row.discipline_id
    where study_group.id is null
       or discipline.id is null
       or study_group.tenant_id <> discipline.tenant_id
       or (curriculum_row.tenant_id is not null and curriculum_row.tenant_id <> study_group.tenant_id)
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.curriculum: unresolved, ambiguous, or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.teacher_preferences as preference
    left join public.teachers as teacher on teacher.id = preference.teacher_id
    where teacher.id is null
       or (preference.tenant_id is not null and preference.tenant_id <> teacher.tenant_id)
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.teacher_preferences: unresolved or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.schedule_versions as version
    left join public.schedules as schedule on schedule.id = version.schedule_id
    where schedule.id is null
       or (version.tenant_id is not null and version.tenant_id <> schedule.tenant_id)
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.schedule_versions: unresolved or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.lessons as lesson
    left join public.schedule_versions as version on version.id = lesson.version_id
    left join public.schedules as schedule on schedule.id = version.schedule_id
    left join public.groups as study_group on study_group.id = lesson.group_id
    left join public.teachers as teacher on teacher.id = lesson.teacher_id
    left join public.rooms as room on room.id = lesson.room_id
    left join public.disciplines as discipline on discipline.id = lesson.discipline_id
    where schedule.id is null
       or study_group.id is null
       or teacher.id is null
       or room.id is null
       or discipline.id is null
       or study_group.tenant_id <> schedule.tenant_id
       or teacher.tenant_id <> schedule.tenant_id
       or room.tenant_id <> schedule.tenant_id
       or discipline.tenant_id <> schedule.tenant_id
       or (lesson.tenant_id is not null and lesson.tenant_id <> schedule.tenant_id)
       or exists (
         select 1
         from unnest(lesson.subgroup_ids) as referenced(subgroup_id)
         left join public.subgroups as subgroup
           on subgroup.id = referenced.subgroup_id
         left join public.groups as subgroup_group
           on subgroup_group.id = subgroup.group_id
         where subgroup.id is null
            or subgroup_group.id is null
            or subgroup_group.tenant_id <> schedule.tenant_id
            or subgroup.tenant_id is distinct from subgroup_group.tenant_id
            or subgroup.group_id <> lesson.group_id
       )
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.lessons: unresolved, ambiguous, or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.conflicts as conflict
    left join public.schedule_versions as version on version.id = conflict.version_id
    left join public.schedules as schedule on schedule.id = version.schedule_id
    where schedule.id is null
       or (conflict.tenant_id is not null and conflict.tenant_id <> schedule.tenant_id)
       or exists (
         select 1
         from unnest(conflict.lesson_ids) as referenced(lesson_id)
         left join public.lessons as lesson on lesson.id = referenced.lesson_id
         left join public.schedule_versions as lesson_version
           on lesson_version.id = lesson.version_id
         left join public.schedules as lesson_schedule
           on lesson_schedule.id = lesson_version.schedule_id
         where lesson.id is null
            or lesson_schedule.id is null
            or lesson_schedule.tenant_id <> schedule.tenant_id
            or (lesson.tenant_id is not null and lesson.tenant_id <> lesson_schedule.tenant_id)
            or lesson.version_id <> conflict.version_id
       )
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.conflicts: unresolved, ambiguous, or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.subscriptions as subscription
    left join (
      select user_id, count(distinct tenant_id) as tenant_count
      from public.user_roles
      group by user_id
    ) as membership on membership.user_id = subscription.user_id
    where membership.user_id is null
       or membership.tenant_count <> 1
       or (
         subscription.tenant_id is not null
         and subscription.tenant_id <> (
          select (array_agg(distinct user_role.tenant_id))[1]
          from public.user_roles as user_role
          where user_role.user_id = subscription.user_id
         )
       )
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.subscriptions: tenant membership is missing or ambiguous';
  end if;

  if exists (
    select 1
    from public.teacher_loads as teacher_load
    left join public.teachers as teacher on teacher.id = teacher_load.teacher_id
    left join public.disciplines as discipline on discipline.id = teacher_load.discipline_id
    where teacher.id is null
       or discipline.id is null
       or teacher.tenant_id <> discipline.tenant_id
       or (teacher_load.tenant_id is not null and teacher_load.tenant_id <> teacher.tenant_id)
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.teacher_loads: unresolved, ambiguous, or cross-tenant rows';
  end if;

  if exists (
    select 1
    from public.group_loads as group_load
    left join public.groups as study_group on study_group.id = group_load.group_id
    left join public.disciplines as discipline on discipline.id = group_load.discipline_id
    where study_group.id is null
       or discipline.id is null
       or study_group.tenant_id <> discipline.tenant_id
       or (group_load.tenant_id is not null and group_load.tenant_id <> study_group.tenant_id)
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'Cannot backfill public.group_loads: unresolved, ambiguous, or cross-tenant rows';
  end if;
end;
$$;

update public.subgroups as subgroup
set tenant_id = study_group.tenant_id
from public.groups as study_group
where subgroup.group_id = study_group.id
  and subgroup.tenant_id is null;

update public.curriculum as curriculum_row
set tenant_id = study_group.tenant_id
from public.groups as study_group
where curriculum_row.group_id = study_group.id
  and curriculum_row.tenant_id is null;

update public.teacher_preferences as preference
set tenant_id = teacher.tenant_id
from public.teachers as teacher
where preference.teacher_id = teacher.id
  and preference.tenant_id is null;

update public.schedule_versions as version
set tenant_id = schedule.tenant_id
from public.schedules as schedule
where version.schedule_id = schedule.id
  and version.tenant_id is null;

update public.lessons as lesson
set tenant_id = schedule.tenant_id
from public.schedule_versions as version
join public.schedules as schedule on schedule.id = version.schedule_id
where lesson.version_id = version.id
  and lesson.tenant_id is null;

update public.conflicts as conflict
set tenant_id = schedule.tenant_id
from public.schedule_versions as version
join public.schedules as schedule on schedule.id = version.schedule_id
where conflict.version_id = version.id
  and conflict.tenant_id is null;

update public.subscriptions as subscription
set tenant_id = membership.tenant_id
from (
  select user_id, (array_agg(distinct tenant_id))[1] as tenant_id
  from public.user_roles
  group by user_id
  having count(distinct tenant_id) = 1
) as membership
where subscription.user_id = membership.user_id
  and subscription.tenant_id is null;

update public.teacher_loads as teacher_load
set tenant_id = teacher.tenant_id
from public.teachers as teacher
where teacher_load.teacher_id = teacher.id
  and teacher_load.tenant_id is null;

update public.group_loads as group_load
set tenant_id = study_group.tenant_id
from public.groups as study_group
where group_load.group_id = study_group.id
  and group_load.tenant_id is null;

alter table public.subgroups alter column tenant_id set not null;
alter table public.curriculum alter column tenant_id set not null;
alter table public.teacher_preferences alter column tenant_id set not null;
alter table public.schedule_versions alter column tenant_id set not null;
alter table public.lessons alter column tenant_id set not null;
alter table public.conflicts alter column tenant_id set not null;
alter table public.subscriptions alter column tenant_id set not null;
alter table public.teacher_loads alter column tenant_id set not null;
alter table public.group_loads alter column tenant_id set not null;

alter table public.subgroups
  add constraint subgroups_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.curriculum
  add constraint curriculum_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.teacher_preferences
  add constraint teacher_preferences_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.schedule_versions
  add constraint schedule_versions_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.lessons
  add constraint lessons_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.conflicts
  add constraint conflicts_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.subscriptions
  add constraint subscriptions_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.teacher_loads
  add constraint teacher_loads_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;
alter table public.group_loads
  add constraint group_loads_tenant_id_fkey foreign key (tenant_id) references public.tenants(id) on delete cascade;

create index if not exists subgroups_tenant_id_idx on public.subgroups (tenant_id);
create index if not exists curriculum_tenant_id_idx on public.curriculum (tenant_id);
create index if not exists teacher_preferences_tenant_id_idx on public.teacher_preferences (tenant_id);
create index if not exists schedule_versions_tenant_id_idx on public.schedule_versions (tenant_id);
create index if not exists lessons_tenant_id_idx on public.lessons (tenant_id);
create index if not exists conflicts_tenant_id_idx on public.conflicts (tenant_id);
create index if not exists subscriptions_tenant_id_idx on public.subscriptions (tenant_id);
create index if not exists teacher_loads_tenant_id_idx on public.teacher_loads (tenant_id);
create index if not exists group_loads_tenant_id_idx on public.group_loads (tenant_id);

-- ---------------------------------------------------------------------------
-- 3. Make tenant identity part of every composite foreign key.
-- ---------------------------------------------------------------------------

alter table public.mappings
  add constraint mappings_tenant_id_id_key unique (tenant_id, id);
alter table public.import_jobs
  add constraint import_jobs_tenant_id_id_key unique (tenant_id, id);
alter table public.export_jobs
  add constraint export_jobs_tenant_id_id_key unique (tenant_id, id);
alter table public.user_roles
  add constraint user_roles_tenant_id_id_key unique (tenant_id, id);
alter table public.specialties
  add constraint specialties_tenant_id_id_key unique (tenant_id, id);
alter table public.groups
  add constraint groups_tenant_id_id_key unique (tenant_id, id);
alter table public.subgroups
  add constraint subgroups_tenant_id_id_key unique (tenant_id, id);
alter table public.semesters
  add constraint semesters_tenant_id_id_key unique (tenant_id, id);
alter table public.disciplines
  add constraint disciplines_tenant_id_id_key unique (tenant_id, id);
alter table public.curriculum
  add constraint curriculum_tenant_id_id_key unique (tenant_id, id);
alter table public.buildings
  add constraint buildings_tenant_id_id_key unique (tenant_id, id);
alter table public.rooms
  add constraint rooms_tenant_id_id_key unique (tenant_id, id);
alter table public.teachers
  add constraint teachers_tenant_id_id_key unique (tenant_id, id);
alter table public.teacher_preferences
  add constraint teacher_preferences_tenant_id_id_key unique (tenant_id, id);
alter table public.schedules
  add constraint schedules_tenant_id_id_key unique (tenant_id, id);
alter table public.schedule_versions
  add constraint schedule_versions_tenant_id_id_key unique (tenant_id, id);
alter table public.lessons
  add constraint lessons_tenant_id_id_key unique (tenant_id, id);
alter table public.conflicts
  add constraint conflicts_tenant_id_id_key unique (tenant_id, id);
alter table public.constraints
  add constraint constraints_tenant_id_id_key unique (tenant_id, id);
alter table public.published_schedules
  add constraint published_schedules_tenant_id_id_key unique (tenant_id, id);
alter table public.notifications
  add constraint notifications_tenant_id_id_key unique (tenant_id, id);
alter table public.subscriptions
  add constraint subscriptions_tenant_id_id_key unique (tenant_id, id);
alter table public.workload_reports
  add constraint workload_reports_tenant_id_id_key unique (tenant_id, id);
alter table public.teacher_loads
  add constraint teacher_loads_tenant_id_id_key unique (tenant_id, id);
alter table public.group_loads
  add constraint group_loads_tenant_id_id_key unique (tenant_id, id);
alter table public.audit_events
  add constraint audit_events_tenant_id_id_key unique (tenant_id, id);
alter table public.change_logs
  add constraint change_logs_tenant_id_id_key unique (tenant_id, id);

alter table public.import_jobs
  add constraint import_jobs_tenant_mapping_fkey
  foreign key (tenant_id, mapping_id) references public.mappings(tenant_id, id)
  on delete set null (mapping_id);
alter table public.groups
  add constraint groups_tenant_specialty_fkey
  foreign key (tenant_id, specialty_id) references public.specialties(tenant_id, id) on delete cascade;
alter table public.subgroups
  add constraint subgroups_tenant_group_fkey
  foreign key (tenant_id, group_id) references public.groups(tenant_id, id) on delete cascade;
alter table public.curriculum
  add constraint curriculum_tenant_group_fkey
  foreign key (tenant_id, group_id) references public.groups(tenant_id, id) on delete cascade;
alter table public.curriculum
  add constraint curriculum_tenant_discipline_fkey
  foreign key (tenant_id, discipline_id) references public.disciplines(tenant_id, id) on delete cascade;
alter table public.rooms
  add constraint rooms_tenant_building_fkey
  foreign key (tenant_id, building_id) references public.buildings(tenant_id, id) on delete cascade;
alter table public.teacher_preferences
  add constraint teacher_preferences_tenant_teacher_fkey
  foreign key (tenant_id, teacher_id) references public.teachers(tenant_id, id) on delete cascade;
alter table public.schedules
  add constraint schedules_tenant_semester_fkey
  foreign key (tenant_id, semester_id) references public.semesters(tenant_id, id) on delete cascade;
alter table public.schedule_versions
  add constraint schedule_versions_tenant_schedule_fkey
  foreign key (tenant_id, schedule_id) references public.schedules(tenant_id, id) on delete cascade;
alter table public.lessons
  add constraint lessons_tenant_version_fkey
  foreign key (tenant_id, version_id) references public.schedule_versions(tenant_id, id) on delete cascade;
alter table public.lessons
  add constraint lessons_tenant_group_fkey
  foreign key (tenant_id, group_id) references public.groups(tenant_id, id) on delete cascade;
alter table public.lessons
  add constraint lessons_tenant_teacher_fkey
  foreign key (tenant_id, teacher_id) references public.teachers(tenant_id, id) on delete cascade;
alter table public.lessons
  add constraint lessons_tenant_room_fkey
  foreign key (tenant_id, room_id) references public.rooms(tenant_id, id) on delete cascade;
alter table public.lessons
  add constraint lessons_tenant_discipline_fkey
  foreign key (tenant_id, discipline_id) references public.disciplines(tenant_id, id) on delete cascade;
alter table public.conflicts
  add constraint conflicts_tenant_version_fkey
  foreign key (tenant_id, version_id) references public.schedule_versions(tenant_id, id) on delete cascade;
alter table public.published_schedules
  add constraint published_schedules_tenant_version_fkey
  foreign key (tenant_id, schedule_version_id) references public.schedule_versions(tenant_id, id) on delete cascade;
alter table public.workload_reports
  add constraint workload_reports_tenant_teacher_fkey
  foreign key (tenant_id, teacher_id) references public.teachers(tenant_id, id)
  on delete set null (teacher_id);
alter table public.workload_reports
  add constraint workload_reports_tenant_semester_fkey
  foreign key (tenant_id, semester_id) references public.semesters(tenant_id, id) on delete cascade;
alter table public.teacher_loads
  add constraint teacher_loads_tenant_teacher_fkey
  foreign key (tenant_id, teacher_id) references public.teachers(tenant_id, id) on delete cascade;
alter table public.teacher_loads
  add constraint teacher_loads_tenant_discipline_fkey
  foreign key (tenant_id, discipline_id) references public.disciplines(tenant_id, id) on delete cascade;
alter table public.group_loads
  add constraint group_loads_tenant_group_fkey
  foreign key (tenant_id, group_id) references public.groups(tenant_id, id) on delete cascade;
alter table public.group_loads
  add constraint group_loads_tenant_discipline_fkey
  foreign key (tenant_id, discipline_id) references public.disciplines(tenant_id, id) on delete cascade;
alter table public.change_logs
  add constraint change_logs_tenant_version_fkey
  foreign key (tenant_id, version_id) references public.schedule_versions(tenant_id, id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. Validate UUID array references independently of scalar foreign keys.
-- ---------------------------------------------------------------------------

create or replace function public.validate_lesson_subgroup_ids()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from unnest(new.subgroup_ids) as referenced(subgroup_id)
    left join public.subgroups as subgroup on subgroup.id = referenced.subgroup_id
    where subgroup.id is null
       or subgroup.tenant_id <> new.tenant_id
       or subgroup.group_id <> new.group_id
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'lessons.subgroup_ids must reference subgroups from the lesson tenant and group';
  end if;

  return new;
end;
$$;

create or replace function public.validate_conflict_lesson_ids()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1
    from unnest(new.lesson_ids) as referenced(lesson_id)
    left join public.lessons as lesson on lesson.id = referenced.lesson_id
    where lesson.id is null
       or lesson.tenant_id <> new.tenant_id
       or lesson.version_id <> new.version_id
  ) then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = 'conflicts.lesson_ids must reference lessons from the conflict tenant and version';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_lesson_subgroup_ids() from public;
revoke all on function public.validate_lesson_subgroup_ids() from anon;
revoke all on function public.validate_lesson_subgroup_ids() from authenticated;
revoke all on function public.validate_conflict_lesson_ids() from public;
revoke all on function public.validate_conflict_lesson_ids() from anon;
revoke all on function public.validate_conflict_lesson_ids() from authenticated;

drop trigger if exists validate_lesson_subgroup_ids on public.lessons;
create trigger validate_lesson_subgroup_ids
before insert or update of tenant_id, group_id, subgroup_ids on public.lessons
for each row execute function public.validate_lesson_subgroup_ids();

drop trigger if exists validate_conflict_lesson_ids on public.conflicts;
create trigger validate_conflict_lesson_ids
before insert or update of tenant_id, version_id, lesson_ids on public.conflicts
for each row execute function public.validate_conflict_lesson_ids();

-- ---------------------------------------------------------------------------
-- 5. Replace recursive and ambiguous tenant/role helpers.
-- ---------------------------------------------------------------------------

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when count(distinct user_role.tenant_id) = 1
      then (array_agg(distinct user_role.tenant_id))[1]
    else null::uuid
  end
  from public.user_roles as user_role
  where user_role.user_id = auth.uid();
$$;

create or replace function public.has_role(requested_role text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.user_roles as user_role
    join public.roles as role on role.id = user_role.role_id
    where user_role.user_id = auth.uid()
      and user_role.tenant_id = public.current_tenant_id()
      and role.name = requested_role
  );
$$;

create or replace function public.can_write_master_data()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role('tenant_admin') or public.has_role('schedule_owner');
$$;

create or replace function public.can_write_schedules()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role('tenant_admin') or public.has_role('schedule_owner');
$$;

create or replace function public.can_publish_schedules()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.has_role('tenant_admin') or public.has_role('schedule_owner');
$$;

revoke all on function public.current_tenant_id() from public;
revoke all on function public.current_tenant_id() from anon;
revoke all on function public.current_tenant_id() from authenticated;
revoke all on function public.has_role(text) from public;
revoke all on function public.has_role(text) from anon;
revoke all on function public.has_role(text) from authenticated;
revoke all on function public.can_write_master_data() from public;
revoke all on function public.can_write_master_data() from anon;
revoke all on function public.can_write_master_data() from authenticated;
revoke all on function public.can_write_schedules() from public;
revoke all on function public.can_write_schedules() from anon;
revoke all on function public.can_write_schedules() from authenticated;
revoke all on function public.can_publish_schedules() from public;
revoke all on function public.can_publish_schedules() from anon;
revoke all on function public.can_publish_schedules() from authenticated;

grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.can_write_master_data() to authenticated;
grant execute on function public.can_write_schedules() to authenticated;
grant execute on function public.can_publish_schedules() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Remove all inherited policies on the 29-table scope.
-- ---------------------------------------------------------------------------

do $$
declare
  scoped_table text;
  policy_record record;
begin
  foreach scoped_table in array array[
    'tenants', 'mappings', 'import_jobs', 'export_jobs',
    'roles', 'user_roles',
    'specialties', 'groups', 'subgroups', 'semesters', 'disciplines', 'curriculum',
    'buildings', 'rooms', 'teachers', 'teacher_preferences',
    'schedules', 'schedule_versions', 'lessons', 'conflicts', 'constraints',
    'published_schedules', 'notifications', 'subscriptions',
    'workload_reports', 'teacher_loads', 'group_loads',
    'audit_events', 'change_logs'
  ]
  loop
    for policy_record in
      select pg_catalog.pg_policies.policyname
      from pg_catalog.pg_policies
      where pg_catalog.pg_policies.schemaname = 'public'
        and pg_catalog.pg_policies.tablename = scoped_table
    loop
      execute pg_catalog.format(
        'drop policy %I on public.%I',
        policy_record.policyname,
        scoped_table
      );
    end loop;

    execute pg_catalog.format('alter table public.%I enable row level security', scoped_table);
    execute pg_catalog.format('revoke all privileges on table public.%I from public', scoped_table);
    execute pg_catalog.format('revoke all privileges on table public.%I from anon', scoped_table);
    execute pg_catalog.format('revoke all privileges on table public.%I from authenticated', scoped_table);
  end loop;
end;
$$;

-- Roles are global metadata but are readable only by authenticated clients.
create policy roles_authenticated_select
on public.roles
for select
to authenticated
using (true);

-- Tenants expose only the single active tenant; only tenant_admin may edit it.
create policy tenants_self_select
on public.tenants
for select
to authenticated
using (id = public.current_tenant_id());

create policy tenants_admin_update
on public.tenants
for update
to authenticated
using (
  id = public.current_tenant_id()
  and public.has_role('tenant_admin')
)
with check (
  id = public.current_tenant_id()
  and public.has_role('tenant_admin')
);

-- Every authenticated user can inspect their own assignments. Only tenant_admin
-- can manage non-owner assignments, and only inside the single active tenant.
create policy user_roles_self_select
on public.user_roles
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

create policy user_roles_tenant_admin_select
on public.user_roles
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
);

create policy user_roles_tenant_admin_insert
on public.user_roles
for insert
to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
  and exists (
    select 1
    from public.roles as role
    where role.id = user_roles.role_id
      and role.name <> 'owner'
  )
);

create policy user_roles_tenant_admin_update
on public.user_roles
for update
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
  and exists (
    select 1
    from public.roles as role
    where role.id = user_roles.role_id
      and role.name <> 'owner'
  )
)
with check (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
  and exists (
    select 1
    from public.roles as role
    where role.id = user_roles.role_id
      and role.name <> 'owner'
  )
);

create policy user_roles_tenant_admin_delete
on public.user_roles
for delete
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
  and exists (
    select 1
    from public.roles as role
    where role.id = user_roles.role_id
      and role.name <> 'owner'
  )
);

-- Master data: all authenticated tenant members read; tenant_admin and
-- schedule_owner receive full row operations.
do $$
declare
  master_table text;
begin
  foreach master_table in array array[
    'mappings',
    'specialties', 'groups', 'subgroups', 'semesters', 'disciplines', 'curriculum',
    'buildings', 'rooms', 'teachers', 'teacher_preferences'
  ]
  loop
    execute pg_catalog.format(
      'create policy %I on public.%I for select to authenticated using (tenant_id = public.current_tenant_id())',
      master_table || '_tenant_select',
      master_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.can_write_master_data())',
      master_table || '_master_insert',
      master_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I for update to authenticated using (tenant_id = public.current_tenant_id() and public.can_write_master_data()) with check (tenant_id = public.current_tenant_id() and public.can_write_master_data())',
      master_table || '_master_update',
      master_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id() and public.can_write_master_data())',
      master_table || '_master_delete',
      master_table
    );
  end loop;
end;
$$;

-- Scheduling and import/export: all authenticated tenant members read;
-- tenant_admin and schedule_owner receive full row operations.
do $$
declare
  schedule_table text;
begin
  foreach schedule_table in array array[
    'import_jobs', 'export_jobs',
    'schedules', 'schedule_versions', 'lessons', 'conflicts', 'constraints'
  ]
  loop
    execute pg_catalog.format(
      'create policy %I on public.%I for select to authenticated using (tenant_id = public.current_tenant_id())',
      schedule_table || '_tenant_select',
      schedule_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I for insert to authenticated with check (tenant_id = public.current_tenant_id() and public.can_write_schedules())',
      schedule_table || '_schedule_insert',
      schedule_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I for update to authenticated using (tenant_id = public.current_tenant_id() and public.can_write_schedules()) with check (tenant_id = public.current_tenant_id() and public.can_write_schedules())',
      schedule_table || '_schedule_update',
      schedule_table
    );
    execute pg_catalog.format(
      'create policy %I on public.%I for delete to authenticated using (tenant_id = public.current_tenant_id() and public.can_write_schedules())',
      schedule_table || '_schedule_delete',
      schedule_table
    );
  end loop;
end;
$$;

-- Publication is a schedule write, but it is isolated behind its explicit
-- capability function so future role changes remain local to this policy set.
create policy published_schedules_tenant_select
on public.published_schedules
for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy published_schedules_publish_insert
on public.published_schedules
for insert
to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and public.can_publish_schedules()
);

create policy published_schedules_publish_update
on public.published_schedules
for update
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.can_publish_schedules()
)
with check (
  tenant_id = public.current_tenant_id()
  and public.can_publish_schedules()
);

create policy published_schedules_publish_delete
on public.published_schedules
for delete
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.can_publish_schedules()
);

-- Notification recipients can read their active-tenant notifications and may
-- update only the two columns granted below.
create policy notifications_recipient_select
on public.notifications
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and recipient_id = auth.uid()
);

create policy notifications_recipient_update
on public.notifications
for update
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and recipient_id = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and recipient_id = auth.uid()
);

-- A user owns subscription CRUD, constrained to the single active tenant.
create policy subscriptions_owner_select
on public.subscriptions
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

create policy subscriptions_owner_insert
on public.subscriptions
for insert
to authenticated
with check (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

create policy subscriptions_owner_update
on public.subscriptions
for update
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

create policy subscriptions_owner_delete
on public.subscriptions
for delete
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and user_id = auth.uid()
);

-- Analytics is read-only for authenticated tenant members.
create policy workload_reports_tenant_select
on public.workload_reports
for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy teacher_loads_tenant_select
on public.teacher_loads
for select
to authenticated
using (tenant_id = public.current_tenant_id());

create policy group_loads_tenant_select
on public.group_loads
for select
to authenticated
using (tenant_id = public.current_tenant_id());

-- Audit history is tenant_admin-only and read-only.
create policy audit_events_tenant_admin_select
on public.audit_events
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
);

create policy change_logs_tenant_admin_select
on public.change_logs
for select
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and public.has_role('tenant_admin')
);

-- ---------------------------------------------------------------------------
-- 7. Grant only operations supported by the policy matrix.
-- ---------------------------------------------------------------------------

do $$
declare
  master_table text;
  schedule_table text;
begin
  foreach master_table in array array[
    'mappings',
    'specialties', 'groups', 'subgroups', 'semesters', 'disciplines', 'curriculum',
    'buildings', 'rooms', 'teachers', 'teacher_preferences'
  ]
  loop
    execute pg_catalog.format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      master_table
    );
  end loop;

  foreach schedule_table in array array[
    'import_jobs', 'export_jobs',
    'schedules', 'schedule_versions', 'lessons', 'conflicts', 'constraints',
    'published_schedules'
  ]
  loop
    execute pg_catalog.format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      schedule_table
    );
  end loop;
end;
$$;

grant select on table public.tenants to authenticated;
grant update (name, code) on table public.tenants to authenticated;
grant select on table public.roles to authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;
grant select on table public.workload_reports to authenticated;
grant select on table public.teacher_loads to authenticated;
grant select on table public.group_loads to authenticated;
grant select on table public.audit_events to authenticated;
grant select on table public.change_logs to authenticated;
grant select on table public.notifications to authenticated;
grant update (status, read_at) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.subscriptions to authenticated;
