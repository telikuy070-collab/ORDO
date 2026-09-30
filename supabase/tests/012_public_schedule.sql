-- 012_public_schedule.sql
-- Verifies the anonymous read contract: allowlisted payload, latest
-- publication wins, no internal data leaks, and no table access is reopened.
begin;

select plan(14);

-- Fixtures.
insert into public.tenants (id, name, code)
values ('12000000-0000-0000-0000-000000000001', 'Публичный колледж', 'public-college');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('22000000-0000-0000-0000-000000000001','authenticated','authenticated','author@internal.test','',now(),now(),now(),'{}','{}');

insert into public.semesters (id, tenant_id, number, start_date, end_date, weeks_count)
values ('61000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 1, '2026-09-01', '2026-12-31', 18);

insert into public.specialties (id, tenant_id, code, name)
values ('31000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', '09.02.07', 'Информатика');

insert into public.groups (id, tenant_id, specialty_id, code, course, semester_number)
values ('41000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
        '31000000-0000-0000-0000-000000000001', 'ИБ-11', 1, 1);

insert into public.disciplines (id, tenant_id, name, type)
values ('71000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Математика', 'lecture');

insert into public.buildings (id, tenant_id, name)
values ('51000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Корпус А');

insert into public.rooms (id, tenant_id, building_id, number, capacity, type)
values ('52000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
        '51000000-0000-0000-0000-000000000001', '101', 30, 'lecture');

insert into public.teachers (id, tenant_id, full_name, email)
values ('53000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
        'Иванова А.П.', 'ivanova@internal.test');

insert into public.schedules (id, tenant_id, semester_id, status)
values ('b1000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
        '61000000-0000-0000-0000-000000000001', 'published');

insert into public.schedule_versions (id, tenant_id, schedule_id, version_number, author_id)
values
  ('c1000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 1, '22000000-0000-0000-0000-000000000001'),
  ('c1000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001', 2, '22000000-0000-0000-0000-000000000001');

insert into public.lessons (id, tenant_id, version_id, group_id, teacher_id, room_id, discipline_id,
                            day_of_week, pair_number, time_start, time_end, week_type, lesson_type)
values
  ('d1000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001',
   '53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
   '71000000-0000-0000-0000-000000000001', 0, 1, '09:00', '10:30', 'all', 'lecture'),
  ('d1000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000001',
   'c1000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001',
   '53000000-0000-0000-0000-000000000001', '52000000-0000-0000-0000-000000000001',
   '71000000-0000-0000-0000-000000000001', 2, 3, '13:00', '14:30', 'odd', 'practice');

-- ---------------------------------------------------------------------------
-- 1. Input handling
-- ---------------------------------------------------------------------------

select is(public.get_published_schedule(null), null::jsonb,
  'null tenant code returns null');

select is(public.get_published_schedule('   '), null::jsonb,
  'blank tenant code returns null');

select is(public.get_published_schedule('does-not-exist'), null::jsonb,
  'unknown tenant code returns null and cannot be used to enumerate colleges');

select is(public.get_published_schedule('public-college'), null::jsonb,
  'tenant without a published schedule returns null');

-- ---------------------------------------------------------------------------
-- 2. Publication
-- ---------------------------------------------------------------------------

insert into public.published_schedules (tenant_id, schedule_version_id, published_by, published_at)
values ('12000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
        '22000000-0000-0000-0000-000000000001', now() - interval '2 days');

insert into public.published_schedules (tenant_id, schedule_version_id, published_by, published_at)
values ('12000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002',
        '22000000-0000-0000-0000-000000000001', now() - interval '1 day');

select is(
  public.get_published_schedule('public-college') -> 'lessons' -> 0 ->> 'discipline',
  'Математика',
  'published schedule returns lesson data'
);

select is(
  jsonb_array_length(public.get_published_schedule('public-college') -> 'lessons'),
  1,
  'only the most recent publication is returned'
);

select is(
  public.get_published_schedule('PUBLIC-COLLEGE') -> 'tenant' ->> 'code',
  'public-college',
  'tenant code lookup is case-insensitive'
);

select is(
  public.get_published_schedule('public-college') #>> '{semester,number}',
  '1',
  'payload carries the semester'
);

-- ---------------------------------------------------------------------------
-- 3. Payload must not leak internals
-- ---------------------------------------------------------------------------

select is(
  public.get_published_schedule('public-college') #>> '{lessons,0,teacherName}',
  'Иванова А.П.',
  'payload carries the teacher display name'
);

select ok(
  public.get_published_schedule('public-college')::text not like '%ivanova@internal.test%',
  'payload does not leak teacher email'
);

select ok(
  public.get_published_schedule('public-college')::text not like '%author@internal.test%',
  'payload does not leak the publishing user'
);

select ok(
  public.get_published_schedule('public-college')::text not like '%22000000-0000-0000-0000-000000000001%',
  'payload does not leak the publisher user id'
);

-- ---------------------------------------------------------------------------
-- 4. Access surface
-- ---------------------------------------------------------------------------

select ok(
  has_function_privilege('anon', 'public.get_published_schedule(text)', 'EXECUTE'),
  'anon may call the public contract'
);

select is(
  (select count(*)::integer
     from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  0,
  'anon still holds no direct table grants'
);

select * from finish();
rollback;
