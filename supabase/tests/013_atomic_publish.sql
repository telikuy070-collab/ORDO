-- 013_atomic_publish.sql
-- Verifies that publication is atomic, conflict-checked and tenant-scoped.
begin;

select plan(15);

-- Fixtures.
insert into public.tenants (id, name, code)
values
  ('13000000-0000-0000-0000-000000000001', 'Издатель А', 'publisher-a'),
  ('13000000-0000-0000-0000-000000000002', 'Издатель Б', 'publisher-b');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('23000000-0000-0000-0000-000000000001','authenticated','authenticated','owner-a@test','',now(),now(),now(),'{}','{}'),
  ('23000000-0000-0000-0000-000000000002','authenticated','authenticated','owner-b@test','',now(),now(),now(),'{}','{}'),
  ('23000000-0000-0000-0000-000000000003','authenticated','authenticated','teacher-a@test','',now(),now(),now(),'{}','{}');

insert into public.user_roles (user_id, role_id, tenant_id)
values
  ('23000000-0000-0000-0000-000000000001',(select id from public.roles where name='schedule_owner'),'13000000-0000-0000-0000-000000000001'),
  ('23000000-0000-0000-0000-000000000002',(select id from public.roles where name='schedule_owner'),'13000000-0000-0000-0000-000000000002'),
  ('23000000-0000-0000-0000-000000000003',(select id from public.roles where name='teacher'),'13000000-0000-0000-0000-000000000001');

insert into public.semesters (id, tenant_id, number, start_date, end_date, weeks_count)
values
  ('62000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001',1,'2026-09-01','2026-12-31',18),
  ('62000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000002',1,'2026-09-01','2026-12-31',18);

insert into public.schedules (id, tenant_id, semester_id, status)
values
  ('b3000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','62000000-0000-0000-0000-000000000001','draft'),
  ('b3000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000002','62000000-0000-0000-0000-000000000002','draft');

insert into public.schedule_versions (id, tenant_id, schedule_id, version_number, author_id)
values
  ('c3000000-0000-0000-0000-000000000001','13000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001',1,'23000000-0000-0000-0000-000000000001'),
  ('c3000000-0000-0000-0000-000000000002','13000000-0000-0000-0000-000000000002','b3000000-0000-0000-0000-000000000002',1,'23000000-0000-0000-0000-000000000002');

-- A version of tenant A that carries a hard conflict.
insert into public.schedule_versions (id, tenant_id, schedule_id, version_number, author_id)
values ('c3000000-0000-0000-0000-000000000003','13000000-0000-0000-0000-000000000001',
        'b3000000-0000-0000-0000-000000000001',2,'23000000-0000-0000-0000-000000000001');

insert into public.conflicts (tenant_id, version_id, type, severity, lesson_ids, description)
values ('13000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000003',
        'teacher_double_booked','hard','{}','Преподаватель занят дважды');

-- ---------------------------------------------------------------------------
-- 1. Access control
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$select public.publish_schedule_version('c3000000-0000-0000-0000-000000000001')$$,
  '42501',
  'permission denied for table schedule_versions',
  'anon cannot publish'
);

set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub":"23000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

-- A teacher has no write policy on schedules, so the locking UPDATE matches no
-- rows and the function reports it explicitly. Failing loudly is deliberate: a
-- silent RLS filter would look like a missing schedule.
select throws_ok(
  $$select public.publish_schedule_version('c3000000-0000-0000-0000-000000000001')$$,
  'OR001',
  'schedule is not writable in the active tenant',
  'teacher cannot publish'
);

-- A schedule_owner of another tenant cannot reach this version.
select set_config('request.jwt.claims',
  '{"sub":"23000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$select public.publish_schedule_version('c3000000-0000-0000-0000-000000000001')$$,
  'OR001',
  'schedule version not found in the active tenant',
  'schedule_owner cannot publish another tenant version'
);

select is(
  (select count(*)::integer from public.published_schedules),
  0,
  'no publication was written by the rejected attempts'
);

-- ---------------------------------------------------------------------------
-- 2. Hard conflicts block publication
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub":"23000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$select public.publish_schedule_version('c3000000-0000-0000-0000-000000000003')$$,
  'OR002',
  '1 hard conflict(s) block publication of version c3000000-0000-0000-0000-000000000003',
  'a version with hard conflicts cannot be published'
);

select is(
  (select count(*)::integer from public.published_schedules),
  0,
  'a blocked publish leaves no publication behind'
);

select is(
  (select status from public.schedules where id = 'b3000000-0000-0000-0000-000000000001'),
  'draft',
  'a blocked publish leaves the schedule in draft'
);

-- ---------------------------------------------------------------------------
-- 3. Happy path is atomic
-- ---------------------------------------------------------------------------

select is(
  (public.publish_schedule_version('c3000000-0000-0000-0000-000000000001') ->> 'scheduleId'),
  'b3000000-0000-0000-0000-000000000001',
  'publishing returns the schedule id'
);

select is(
  (select status from public.schedules where id = 'b3000000-0000-0000-0000-000000000001'),
  'published',
  'publishing marks the schedule published in the same statement'
);

select is(
  (select count(*)::integer from public.published_schedules where schedule_version_id = 'c3000000-0000-0000-0000-000000000001'),
  1,
  'publishing writes exactly one publication row'
);

select is(
  (select published_by from public.published_schedules
    where schedule_version_id = 'c3000000-0000-0000-0000-000000000001'),
  '23000000-0000-0000-0000-000000000001'::uuid,
  'the publication records the authenticated publisher'
);

-- Republishing from another tenant appends rather than replacing. The actor has
-- to match the tenant, since current_tenant_id() is the scope for everything.
select set_config('request.jwt.claims',
  '{"sub":"23000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select public.publish_schedule_version('c3000000-0000-0000-0000-000000000002') ->> 'versionId'),
  'c3000000-0000-0000-0000-000000000002',
  'a second schedule can be published'
);

-- Republishing the same version must be a no-op. published_schedules allows one
-- row per version, so a second insert would surface a raw constraint error to
-- the user instead of a successful no-op.
select is(
  (select public.publish_schedule_version('c3000000-0000-0000-0000-000000000002') ->> 'versionId'),
  'c3000000-0000-0000-0000-000000000002',
  'republishing the same version succeeds'
);

select is(
  (select count(*)::integer
     from public.published_schedules
    where schedule_version_id = 'c3000000-0000-0000-0000-000000000002'),
  1,
  'republishing does not create a duplicate publication'
);

-- Counted as the owner role, not as the current tenant: the RLS select policy
-- only exposes the caller's own tenant, so counting while acting as tenant B
-- would see one row and wrongly suggest the publication was replaced. Scoped to
-- this test's own tenants, because the project database already holds
-- publications created by the demo seed that the rollback does not remove.
reset role;

select is(
  (select count(*)::integer
     from public.published_schedules
    where tenant_id in ('13000000-0000-0000-0000-000000000001',
                        '13000000-0000-0000-0000-000000000002')),
  2,
  'publications are append-only'
);

select * from finish();
rollback;
