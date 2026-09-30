-- 009_rls_hardening.sql
-- pgTAP coverage for fail-closed tenant helpers, the RLS matrix, and tenant
-- integrity constraints. Run only against an isolated local/staging database.

begin;

select plan(47);

-- Deterministic tenants.
insert into public.tenants (id, name, code)
values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A', 'tenant-a'),
  ('10000000-0000-0000-0000-000000000002', 'Tenant B', 'tenant-b');

-- Auth principals used by the behavioral RLS tests.
insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
values
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'admin-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'schedule-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'department-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'teacher-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'multi@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'recipient-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb),
  ('20000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'staff-a@example.test', '', now(), now(), now(), '{}'::jsonb, '{}'::jsonb);

insert into public.user_roles (user_id, role_id, tenant_id)
values
  ('20000000-0000-0000-0000-000000000001', (select id from public.roles where name = 'tenant_admin'), '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', (select id from public.roles where name = 'schedule_owner'), '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000003', (select id from public.roles where name = 'department_head'), '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000004', (select id from public.roles where name = 'teacher'), '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', (select id from public.roles where name = 'tenant_admin'), '10000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000005', (select id from public.roles where name = 'teacher'), '10000000-0000-0000-0000-000000000002'),
  ('20000000-0000-0000-0000-000000000006', (select id from public.roles where name = 'teacher'), '10000000-0000-0000-0000-000000000001');

-- Tenant-scoped master and scheduling fixtures.
insert into public.specialties (id, tenant_id, code, name)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A', 'Specialty A'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'B', 'Specialty B');

insert into public.groups (
  id, tenant_id, specialty_id, code, course, semester_number
)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'A-1', 1, 1),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'B-1', 1, 1);

insert into public.subgroups (id, tenant_id, group_id, number)
values
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', 1);

insert into public.semesters (id, tenant_id, number, start_date, end_date, weeks_count)
values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 1, '2026-09-01', '2026-12-31', 18),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 1, '2026-09-01', '2026-12-31', 18),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 2, '2027-01-01', '2027-05-31', 18);

insert into public.disciplines (id, tenant_id, name, type)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Discipline A', 'lecture'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Discipline B', 'lecture');

insert into public.buildings (id, tenant_id, name)
values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Building A'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Building B');

insert into public.rooms (id, tenant_id, building_id, number, capacity, type)
values
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'A-1', 30, 'lecture'),
  ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 'B-1', 30, 'lecture');

insert into public.teachers (id, tenant_id, full_name, email)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Teacher A', 'teacher-a-data@example.test'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Teacher B', 'teacher-b-data@example.test');

insert into public.schedules (id, tenant_id, semester_id, status)
values
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'draft'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'draft');

insert into public.schedule_versions (id, tenant_id, schedule_id, version_number, author_id)
values
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, '20000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1, '20000000-0000-0000-0000-000000000002');

insert into public.lessons (
  id, tenant_id, version_id, group_id, subgroup_ids, teacher_id, room_id,
  discipline_id, day_of_week, pair_number, time_start, time_end, week_type, lesson_type
)
values
  (
    'd0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    array['50000000-0000-0000-0000-000000000001'::uuid],
    'a0000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    1, 1, '08:00', '09:30', 'all', 'lecture'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    array['50000000-0000-0000-0000-000000000002'::uuid],
    'a0000000-0000-0000-0000-000000000002',
    '90000000-0000-0000-0000-000000000002',
    '70000000-0000-0000-0000-000000000002',
    1, 1, '08:00', '09:30', 'all', 'lecture'
  );

insert into public.notifications (id, tenant_id, recipient_id, type, status)
values
  ('e0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', 'schedule_changed', 'pending'),
  ('e0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'schedule_changed', 'pending');

insert into public.workload_reports (id, tenant_id, teacher_id, semester_id, total_hours)
values
  ('e1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 10),
  ('e1000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 12);

insert into public.audit_events (id, tenant_id, action, entity, entity_id)
values
  ('f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'create', 'schedule', 'b0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'create', 'schedule', 'b0000000-0000-0000-0000-000000000002');

insert into public.change_logs (id, tenant_id, version_id)
values
  ('f1000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');

-- 1. current_tenant_id fails closed for zero, one, and multiple memberships.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000008', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000008","role":"authenticated"}',
  true
);
select is(
  public.current_tenant_id(),
  null::uuid,
  'current_tenant_id returns NULL without a membership'
);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.current_tenant_id(),
  '10000000-0000-0000-0000-000000000001'::uuid,
  'current_tenant_id returns the only distinct tenant'
);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000005","role":"authenticated"}',
  true
);
select is(
  public.current_tenant_id(),
  null::uuid,
  'current_tenant_id returns NULL for multiple distinct memberships'
);

-- 2. has_role is tenant-scoped and fail-closed.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select ok(public.has_role('tenant_admin'), 'has_role accepts an active-tenant role');
select ok(not public.has_role('teacher'), 'has_role rejects a role absent from the active tenant');

set local role authenticated;

-- 3. Roles and tenant records.
select is(
  (select count(*)::integer from public.roles),
  6,
  'authenticated can read global roles'
);
select is(
  (select count(*)::integer from public.tenants),
  1,
  'tenant_admin sees only the active tenant'
);
with attempt as (
  update public.tenants set name = 'Tenant A renamed'
  where id = '10000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'tenant_admin can update the active tenant'
);

-- 4. Master and schedule write matrix plus cross-tenant negatives.
select is(
  (select count(*)::integer from public.specialties),
  1,
  'tenant_admin reads active-tenant master data'
);
select throws_ok(
  $$insert into public.specialties (tenant_id, code, name)
    values ('10000000-0000-0000-0000-000000000002', 'FORBIDDEN', 'Forbidden')$$,
  '42501',
  'new row violates row-level security policy for table "specialties"',
  'tenant_admin cannot insert cross-tenant master data'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.schedules),
  1,
  'schedule_owner reads active-tenant schedules'
);
with attempt as (
  insert into public.schedules (id, tenant_id, semester_id)
  values ('b0000000-0000-0000-0000-000000000003',
          '10000000-0000-0000-0000-000000000001',
          '60000000-0000-0000-0000-000000000003')
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'schedule_owner can insert an active-tenant schedule'
);
select throws_ok(
  $$insert into public.schedules (id, tenant_id, semester_id)
    values ('b0000000-0000-0000-0000-000000000004',
            '10000000-0000-0000-0000-000000000002',
            '60000000-0000-0000-0000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "schedules"',
  'schedule_owner cannot insert a cross-tenant schedule'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.specialties),
  1,
  'department_head reads active-tenant master data'
);
select throws_ok(
  $$insert into public.specialties (tenant_id, code, name)
    values ('10000000-0000-0000-0000-000000000002', 'FORBIDDEN-2', 'Forbidden')$$,
  '42501',
  'new row violates row-level security policy for table "specialties"',
  'department_head cannot write master data'
);
select is(
  (select count(*)::integer from public.schedules),
  2,
  'department_head reads active-tenant schedules'
);
select throws_ok(
  $$insert into public.schedules (tenant_id, semester_id)
    values ('10000000-0000-0000-0000-000000000001',
            '60000000-0000-0000-0000-000000000001')$$,
  '42501',
  'new row violates row-level security policy for table "schedules"',
  'department_head cannot write schedules'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select ok(not public.can_write_schedules(), 'teacher cannot write schedules');
select is(
  (select count(*)::integer from public.specialties),
  1,
  'teacher reads active-tenant master data'
);

-- 5. Notification recipient access is limited to status/read_at.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000006', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000006","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.notifications),
  1,
  'recipient sees only their own notification'
);
select throws_ok(
  $$update public.notifications set recipient_id = '20000000-0000-0000-0000-000000000001'
    where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '42501',
  'permission denied for table notifications',
  'recipient cannot reassign recipient_id'
);
with attempt as (
  update public.notifications set status = 'read', read_at = now()
  where id = 'e0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'recipient can update notification status and read_at'
);
select ok(
  not has_column_privilege('authenticated', 'public.notifications', 'payload', 'UPDATE'),
  'recipient has no notification payload update privilege'
);
select throws_ok(
  $$update public.notifications set payload = '{}'::jsonb
    where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '42501',
  'permission denied for table notifications',
  'recipient cannot update notification payload'
);

-- 6. Subscription CRUD belongs to the active user.
with attempt as (
  insert into public.subscriptions (id, tenant_id, user_id, channel)
  values ('e2000000-0000-0000-0000-000000000001',
          '10000000-0000-0000-0000-000000000001',
          '20000000-0000-0000-0000-000000000006',
          'email')
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'owner can insert a subscription'
);
select is(
  (select count(*)::integer from public.subscriptions),
  1,
  'owner reads their subscription'
);
with attempt as (
  update public.subscriptions set is_active = false
  where id = 'e2000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'owner can update their subscription'
);
with attempt as (
  delete from public.subscriptions
  where id = 'e2000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'owner can delete their subscription'
);

-- 7. User roles are self-readable and tenant_admin-managed without owner
-- self-escalation.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.user_roles),
  1,
  'teacher reads their own role'
);
select throws_ok(
  $$insert into public.user_roles (user_id, role_id, tenant_id)
    values ('20000000-0000-0000-0000-000000000004',
            (select id from public.roles where name = 'tenant_admin'),
            '10000000-0000-0000-0000-000000000001')$$,
  '42501',
  'new row violates row-level security policy for table "user_roles"',
  'teacher cannot self-escalate'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
with attempt as (
  insert into public.user_roles (user_id, role_id, tenant_id)
  values ('20000000-0000-0000-0000-000000000007',
          (select id from public.roles where name = 'teacher'),
          '10000000-0000-0000-0000-000000000001')
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'tenant_admin can insert a tenant role'
);
with attempt as (
  update public.user_roles
  set role_id = (select id from public.roles where name = 'department_head')
  where user_id = '20000000-0000-0000-0000-000000000007'
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'tenant_admin can update a tenant role'
);
with attempt as (
  delete from public.user_roles
  where user_id = '20000000-0000-0000-0000-000000000007'
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'tenant_admin can delete a tenant role'
);
select throws_ok(
  $$update public.user_roles
    set role_id = (select id from public.roles where name = 'owner')
    where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  'new row violates row-level security policy for table "user_roles"',
  'tenant_admin cannot self-escalate to owner'
);

-- 8. Analytics and audit remain read-only with distinct role scopes.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.workload_reports),
  1,
  'teacher reads active-tenant analytics'
);
select is(
  (select count(*)::integer from public.workload_reports where tenant_id = '10000000-0000-0000-0000-000000000002'),
  0,
  'teacher cannot read cross-tenant analytics'
);
select is(
  (select count(*)::integer from public.audit_events),
  0,
  'teacher cannot read audit history'
);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select is(
  (select count(*)::integer from public.audit_events),
  1,
  'tenant_admin reads active-tenant audit history'
);
select is(
  (select count(*)::integer from public.change_logs),
  1,
  'tenant_admin reads active-tenant change logs'
);
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
select set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select throws_ok(
  $$insert into public.audit_events (tenant_id, action, entity, entity_id)
    values ('10000000-0000-0000-0000-000000000001', 'create', 'forbidden', gen_random_uuid()) $$,
  '42501',
  'permission denied for table audit_events',
  'authenticated roles cannot write audit history'
);

-- 9. Anonymous has no table privileges.
set local role anon;
select throws_ok(
  'select count(*) from public.roles',
  '42501',
  'permission denied for table roles',
  'anon cannot read roles'
);
select throws_ok(
  'select count(*) from public.specialties',
  '42501',
  'permission denied for table specialties',
  'anon cannot read tenant master data'
);

reset role;

-- 10. Composite tenant foreign keys and array validation triggers.
select throws_ok(
  $$insert into public.curriculum (tenant_id, group_id, discipline_id, control_type)
    values ('10000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', 'exam')$$,
  '23503',
  'insert or update on table "curriculum" violates foreign key constraint "curriculum_tenant_discipline_fkey"',
  'composite foreign key rejects a cross-tenant discipline'
);
with attempt as (
  insert into public.curriculum (tenant_id, group_id, discipline_id, control_type)
  values ('10000000-0000-0000-0000-000000000001',
          '40000000-0000-0000-0000-000000000001',
          '70000000-0000-0000-0000-000000000001',
          'exam')
  returning 1
)
select is((select count(*)::integer from attempt), 1,
  'composite foreign key accepts matching tenant references'
);
select throws_ok(
  $$insert into public.lessons (
    tenant_id, version_id, group_id, subgroup_ids, teacher_id, room_id,
    discipline_id, day_of_week, pair_number, time_start, time_end, week_type, lesson_type
  ) values (
    '10000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    array['50000000-0000-0000-0000-000000000002'::uuid],
    'a0000000-0000-0000-0000-000000000001',
    '90000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    2, 1, '10:00', '11:30', 'all', 'lecture'
  ) $$,
   '23000',
  'lessons.subgroup_ids must reference subgroups from the lesson tenant and group',
  'lesson subgroup trigger rejects a cross-tenant subgroup'
);
select throws_ok(
  $$insert into public.conflicts (tenant_id, version_id, type, severity, lesson_ids, description)
    values (
      '10000000-0000-0000-0000-000000000001',
      'c0000000-0000-0000-0000-000000000001',
      'teacher_double_booked',
      'hard',
      array['d0000000-0000-0000-0000-000000000002'::uuid],
      'Cross-tenant conflict fixture'
    ) $$,
   '23000',
  'conflicts.lesson_ids must reference lessons from the conflict tenant and version',
  'conflict lesson trigger rejects a cross-tenant lesson'
);

-- 11. No permissive FOR ALL policy remains in the 29-table scope.
select is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'tenants', 'mappings', 'import_jobs', 'export_jobs',
        'roles', 'user_roles',
        'specialties', 'groups', 'subgroups', 'semesters', 'disciplines', 'curriculum',
        'buildings', 'rooms', 'teachers', 'teacher_preferences',
        'schedules', 'schedule_versions', 'lessons', 'conflicts', 'constraints',
        'published_schedules', 'notifications', 'subscriptions',
        'workload_reports', 'teacher_loads', 'group_loads',
        'audit_events', 'change_logs'
      ])
      and cmd = 'ALL'
  ),
  0,
  'no scoped policy uses FOR ALL'
);

select * from finish();
rollback;
