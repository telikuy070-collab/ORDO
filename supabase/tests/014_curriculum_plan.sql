-- 014_curriculum_plan.sql
-- Verifies the curriculum-plan storage added by 014: departments, plans, items
-- and weekly distribution, their tenant scoping, their RLS surface and the
-- composite tenant foreign keys that keep a plan inside its own college.
--
-- The workbook is the source of truth, so the shape asserted here mirrors what
-- the import produces: a department per block, a plan per block, one item per
-- discipline line, and one week row per weekly column — including the columns
-- that hold the non-numeric marker "П" instead of hours.
begin;

select plan(18);

-- Fixtures. Two colleges, because almost every guarantee in 014 is expressed
-- as "and not for the other one".
insert into public.tenants (id, name, code) values
  ('14000000-0000-0000-0000-000000000001', 'Колледж', 'college-a'),
  ('14000000-0000-0000-0000-000000000002', 'Другой колледж', 'college-b');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('24000000-0000-0000-0000-000000000001','authenticated','authenticated','owner-a@example.test','',now(),now(),now(),'{}','{}'),
  ('24000000-0000-0000-0000-000000000002','authenticated','authenticated','teacher-a@example.test','',now(),now(),now(),'{}','{}'),
  ('24000000-0000-0000-0000-000000000003','authenticated','authenticated','admin-a@example.test','',now(),now(),now(),'{}','{}'),
  ('24000000-0000-0000-0000-000000000004','authenticated','authenticated','owner-b@example.test','',now(),now(),now(),'{}','{}');

-- Each user holds exactly one membership: current_tenant_id() fails closed for
-- anyone with more, so a second tenant here would make every later check moot.
insert into public.user_roles (user_id, role_id, tenant_id) values
  ('24000000-0000-0000-0000-000000000001',(select id from public.roles where name='schedule_owner'),'14000000-0000-0000-0000-000000000001'),
  ('24000000-0000-0000-0000-000000000002',(select id from public.roles where name='teacher'),'14000000-0000-0000-0000-000000000001'),
  ('24000000-0000-0000-0000-000000000003',(select id from public.roles where name='tenant_admin'),'14000000-0000-0000-0000-000000000001'),
  ('24000000-0000-0000-0000-000000000004',(select id from public.roles where name='schedule_owner'),'14000000-0000-0000-0000-000000000002');

insert into public.semesters (id, tenant_id, number, start_date, end_date, weeks_count) values
  ('64000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001',1,'2026-09-01','2026-12-31',18),
  ('64000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000002',1,'2026-09-01','2026-12-31',18);

-- "ЛД-1-23" is deliberately given to both colleges: a specialty code is only
-- unique inside a college, and section 5 pins that down.
insert into public.departments (id, tenant_id, code, name) values
  ('34000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','ЛД-1-23','Лабораторное дело'),
  ('34000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000002','ЛД-1-23','Лабораторное дело'),
  ('34000000-0000-0000-0000-000000000003','14000000-0000-0000-0000-000000000001','ФЯ-1-2','Физиология животных');

insert into public.curriculum_plans (
  id, tenant_id, department_id, semester_id, course, academic_year,
  source_file_name, source_sheet_name, source_row_from, raw_block_header
) values
  ('44000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','34000000-0000-0000-0000-000000000001','64000000-0000-0000-0000-000000000001',1,'2026/2027','Сем_окуу_планы_МК_1_сем_26-27.АВ (1).xls','МК_1_сем',1,'ЛД-1-23 Лабораторное дело'),
  ('44000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000002','34000000-0000-0000-0000-000000000002','64000000-0000-0000-0000-000000000002',1,'2026/2027','Сем_окуу_планы_МК_1_сем_26-27.АВ (1).xls','МК_1_сем',1,'ЛД-1-23 Лабораторное дело');

insert into public.curriculum_items (id, tenant_id, plan_id, subject_name, activity_type, total_hours, source_row) values
  ('54000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','44000000-0000-0000-0000-000000000001','Физиология животных','lecture',72,1),
  ('54000000-0000-0000-0000-000000000002','14000000-0000-0000-0000-000000000002','44000000-0000-0000-0000-000000000002','Физиология животных','lecture',72,1);

insert into public.curriculum_item_weeks (id, tenant_id, item_id, week_no, hours) values
  ('94000000-0000-0000-0000-000000000001','14000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001',1,4);

-- ---------------------------------------------------------------------------
-- 1. A deputy director owns the master data of their own college
-- ---------------------------------------------------------------------------

set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub":"24000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

insert into public.departments (id, tenant_id, code, name)
values ('34000000-0000-0000-0000-000000000004','14000000-0000-0000-0000-000000000001','СД-1-2','Стоматология');

select is(
  (select count(*)::integer from public.departments
    where tenant_id = '14000000-0000-0000-0000-000000000001'
      and code = 'СД-1-2'),
  1,
  'schedule_owner can insert a department in their own tenant'
);

select is(
  (select name from public.departments
    where tenant_id = '14000000-0000-0000-0000-000000000001'
      and code = 'СД-1-2'),
  'Стоматология',
  'the department they just created is readable by them'
);

-- ---------------------------------------------------------------------------
-- 2. A teacher has no write policy on master data
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub":"24000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.departments (tenant_id, code, name)
    values ('14000000-0000-0000-0000-000000000001','СД-9-9','Forbidden')$$,
  '42501',
  'new row violates row-level security policy for table "departments"',
  'teacher cannot insert a department'
);

-- ---------------------------------------------------------------------------
-- 3. anon reaches the curriculum plan through nothing at all
-- ---------------------------------------------------------------------------

set local role anon;

select throws_ok(
  'select count(*) from public.departments',
  '42501',
  'permission denied for table departments',
  'anon cannot read departments'
);

set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub":"24000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- ---------------------------------------------------------------------------
-- 4-5. A department code is unique per college, not globally
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.departments (tenant_id, code, name)
    values ('14000000-0000-0000-0000-000000000001','ЛД-1-23','Дубль кода')$$,
  '23505',
  'duplicate key value violates unique constraint "departments_tenant_id_code_key"',
  'a department code cannot repeat inside one college'
);

-- Counted as the table owner, not as the current tenant: the select policy
-- would otherwise hide the other college and make two tenants look like one.
-- Scoped to this test's own colleges, so rows the project database already
-- holds cannot change the result.
reset role;

select is(
  (select count(*)::integer from public.departments
    where code = 'ЛД-1-23'
      and tenant_id in ('14000000-0000-0000-0000-000000000001',
                        '14000000-0000-0000-0000-000000000002')),
  2,
  'the same department code is accepted in a different tenant'
);

set local role authenticated;

select set_config('request.jwt.claims',
  '{"sub":"24000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- ---------------------------------------------------------------------------
-- 6-7. A plan belongs to one college and is invisible to the other
-- ---------------------------------------------------------------------------

insert into public.curriculum_plans (
  id, tenant_id, department_id, semester_id, course, academic_year,
  source_file_name, source_sheet_name, source_row_from, raw_block_header
) values (
  '44000000-0000-0000-0000-000000000003',
  '14000000-0000-0000-0000-000000000001',
  '34000000-0000-0000-0000-000000000003',
  '64000000-0000-0000-0000-000000000001',
  1, '2026/2027', 'Сем_окуу_планы_МК_1_сем_26-27.АВ (1).xls', 'МК_1_сем', 42,
  'ФЯ-1-2 Физиология животных'
);

select is(
  (select count(*)::integer from public.curriculum_plans),
  2,
  'a newly created plan lists under its own tenant'
);

select is(
  (select count(*)::integer from public.curriculum_plans
    where id = '44000000-0000-0000-0000-000000000002'),
  0,
  'a plan of another tenant is filtered out, not refused'
);

-- ---------------------------------------------------------------------------
-- 8. An item is anchored to its workbook row
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.curriculum_items (tenant_id, plan_id, source_row)
    values ('14000000-0000-0000-0000-000000000001',
            '44000000-0000-0000-0000-000000000001', 7)$$,
  '23502',
  'null value in column "subject_name" of relation "curriculum_items" violates not-null constraint',
  'an item without a subject name is rejected'
);

select throws_ok(
  $$insert into public.curriculum_items (tenant_id, plan_id, subject_name)
    values ('14000000-0000-0000-0000-000000000001',
            '44000000-0000-0000-0000-000000000001', 'Биохимия')$$,
  '23502',
  'null value in column "source_row" of relation "curriculum_items" violates not-null constraint',
  'an item without a source row is rejected'
);

select throws_ok(
  $$insert into public.curriculum_items (tenant_id, plan_id, subject_name, source_row)
    values ('14000000-0000-0000-0000-000000000001',
            '44000000-0000-0000-0000-000000000001', 'Биохимия', 1)$$,
  '23505',
  'duplicate key value violates unique constraint "curriculum_items_plan_id_source_row_key"',
  'two items cannot come from the same workbook row of the same plan'
);

-- ---------------------------------------------------------------------------
-- 9. Weekly distribution, including the non-numeric "П" column
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.curriculum_item_weeks (tenant_id, item_id, week_no, hours)
    values ('14000000-0000-0000-0000-000000000001',
            '54000000-0000-0000-0000-000000000001', 1, 4)$$,
  '23505',
  'duplicate key value violates unique constraint "curriculum_item_weeks_item_id_week_no_key"',
  'a week number cannot repeat inside one item'
);

-- The workbook writes "П" in some weekly columns and no number at all, so an
-- hours-less week is ordinary data rather than a missing value.
insert into public.curriculum_item_weeks (tenant_id, item_id, week_no, hours) values
  ('14000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001',2,4);
insert into public.curriculum_item_weeks (tenant_id, item_id, week_no, hours, marker) values
  ('14000000-0000-0000-0000-000000000001','54000000-0000-0000-0000-000000000001',3,null,'П');

select is(
  (select count(*)::integer from public.curriculum_item_weeks
    where item_id = '54000000-0000-0000-0000-000000000001'),
  3,
  'distinct week numbers are accepted for the same item'
);

select is(
  (select marker from public.curriculum_item_weeks
    where item_id = '54000000-0000-0000-0000-000000000001' and week_no = 3),
  'П',
  'a week may carry the workbook marker instead of hours'
);

-- ---------------------------------------------------------------------------
-- 10-11. The composite keys refuse a reference into another college
-- ---------------------------------------------------------------------------

-- The row-level check passes, because tenant_id is the caller's own: what stops
-- the plan is the (tenant_id, id) foreign key, not the policy.
select throws_ok(
  $$insert into public.curriculum_plans (
      id, tenant_id, department_id, course, academic_year, source_file_name,
      source_sheet_name, source_row_from, raw_block_header
    ) values (
      '44000000-0000-0000-0000-000000000004',
      '14000000-0000-0000-0000-000000000001',
      '34000000-0000-0000-0000-000000000002',
      1, '2026/2027', 'Сем_окуу_планы_МК_1_сем_26-27.АВ (1).xls', 'МК_1_сем', 91,
      'ЛД-1-23 Лабораторное дело'
    )$$,
  '23503',
  'insert or update on table "curriculum_plans" violates foreign key constraint "curriculum_plans_tenant_department_fkey"',
  'a plan cannot point at a department of another tenant'
);

select throws_ok(
  $$insert into public.curriculum_item_weeks (tenant_id, item_id, week_no, hours)
    values ('14000000-0000-0000-0000-000000000001',
            '54000000-0000-0000-0000-000000000002', 1, 4)$$,
  '23503',
  'insert or update on table "curriculum_item_weeks" violates foreign key constraint "curriculum_item_weeks_tenant_item_fkey"',
  'a week cannot point at an item of another tenant'
);

-- ---------------------------------------------------------------------------
-- 12-13. The privilege surface of the four new tables
-- ---------------------------------------------------------------------------

reset role;

select is(
  (select count(*)::integer from pg_policies
    where schemaname = 'public'
      and cmd = 'ALL'
      and tablename in ('departments', 'curriculum_plans', 'curriculum_items', 'curriculum_item_weeks')),
  0,
  'no curriculum plan table has a FOR ALL policy'
);

select is(
  (select count(*)::integer
     from unnest(array['departments', 'curriculum_plans', 'curriculum_items', 'curriculum_item_weeks']) as t(name)
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as p(priv)
    where has_table_privilege('anon', 'public.' || t.name, p.priv)),
  0,
  'anon holds no table privilege on the curriculum plan tables'
);

select * from finish();
rollback;
