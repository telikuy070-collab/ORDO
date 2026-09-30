-- 010_profiles.sql
-- Verifies the profiles table, its sync triggers, and its RLS surface.
begin;

select plan(15);

-- Fixtures.
insert into public.tenants (id, name, code) values
  ('11000000-0000-0000-0000-000000000001', 'Tenant P', 'tenant-p'),
  ('11000000-0000-0000-0000-000000000002', 'Tenant Q', 'tenant-q');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('21000000-0000-0000-0000-000000000001','authenticated','authenticated','admin-p@example.test','',now(),now(),now(),'{}','{"full_name":"Admin P"}'),
  ('21000000-0000-0000-0000-000000000002','authenticated','authenticated','teacher-p@example.test','',now(),now(),now(),'{}','{"full_name":"Teacher P"}'),
  ('21000000-0000-0000-0000-000000000003','authenticated','authenticated','admin-q@example.test','',now(),now(),now(),'{}','{"full_name":"Admin Q"}');

-- 1. The auth trigger auto-creates a profile carrying the email and name.
select is(
  (select count(*)::integer from public.profiles
    where id = '21000000-0000-0000-0000-000000000001'
      and email = 'admin-p@example.test'
      and full_name = 'Admin P'),
  1,
  'auth.users trigger creates a profile with email and full name'
);

-- 2. Role assignment binds the profile to the tenant from user_roles.
insert into public.user_roles (user_id, role_id, tenant_id) values
  ('21000000-0000-0000-0000-000000000001',(select id from public.roles where name='tenant_admin'),'11000000-0000-0000-0000-000000000001'),
  ('21000000-0000-0000-0000-000000000002',(select id from public.roles where name='teacher'),'11000000-0000-0000-0000-000000000001'),
  ('21000000-0000-0000-0000-000000000003',(select id from public.roles where name='tenant_admin'),'11000000-0000-0000-0000-000000000002');

select is(
  (select tenant_id from public.profiles where id = '21000000-0000-0000-0000-000000000001'),
  '11000000-0000-0000-0000-000000000001'::uuid,
  'user_roles trigger binds the profile to its tenant'
);

-- 3. A profile binds to its first tenant and is never silently re-bound.
-- A dedicated user is used here so the single-tenant admin checks below stay valid.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('21000000-0000-0000-0000-000000000004','authenticated','authenticated','multi@example.test','',now(),now(),now(),'{}','{"full_name":"Multi"}');

insert into public.user_roles (user_id, role_id, tenant_id) values
  ('21000000-0000-0000-0000-000000000004',(select id from public.roles where name='tenant_admin'),'11000000-0000-0000-0000-000000000001');

select is(
  (select tenant_id from public.profiles where id = '21000000-0000-0000-0000-000000000004'),
  '11000000-0000-0000-0000-000000000001'::uuid,
  'profile binds to the first assigned tenant'
);

insert into public.user_roles (user_id, role_id, tenant_id)
values ('21000000-0000-0000-0000-000000000004',
        (select id from public.roles where name='teacher'),
        '11000000-0000-0000-0000-000000000002');

select is(
  (select tenant_id from public.profiles where id = '21000000-0000-0000-0000-000000000004'),
  '11000000-0000-0000-0000-000000000001'::uuid,
  'profile keeps its original tenant when a second membership is added'
);

-- The user now spans two tenants, so current_tenant_id() must fail closed.
select set_config('request.jwt.claims',
  '{"sub":"21000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select is(
  public.current_tenant_id(),
  null::uuid,
  'multi-tenant user resolves to no active tenant'
);

set local role authenticated;

-- 4. A user can read their own profile even before/without tenant binding.
select set_config('request.jwt.claims',
  '{"sub":"21000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.profiles
    where id = '21000000-0000-0000-0000-000000000002'),
  1,
  'a user can read their own profile'
);

-- 5. A plain teacher cannot read the tenant roster through profiles.
select is(
  (select count(*)::integer from public.profiles
    where tenant_id = '11000000-0000-0000-0000-000000000001'),
  1,
  'teacher sees only their own profile, not the roster'
);

-- 6. A tenant_admin can read the roster of their own tenant.
-- Tenant P holds: admin-p, teacher-p and the multi-tenant user from section 3.
select set_config('request.jwt.claims',
  '{"sub":"21000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is(
  (select count(*)::integer from public.profiles
    where tenant_id = '11000000-0000-0000-0000-000000000001'),
  3,
  'tenant_admin reads the full roster of their own tenant'
);

-- 7. A tenant_admin cannot read another tenant's roster.
select is(
  (select count(*)::integer from public.profiles
    where tenant_id = '11000000-0000-0000-0000-000000000002'),
  0,
  'tenant_admin cannot read another tenant roster'
);

-- 8. Only full_name is client-writable.
select ok(
  has_column_privilege('authenticated','public.profiles','full_name','UPDATE'),
  'authenticated may update full_name'
);
select ok(
  not has_column_privilege('authenticated','public.profiles','email','UPDATE'),
  'authenticated may not update email'
);
select ok(
  not has_column_privilege('authenticated','public.profiles','tenant_id','UPDATE'),
  'authenticated may not update tenant_id'
);

-- 9. anon has no access to profiles.
set local role anon;
select throws_ok(
  'select count(*) from public.profiles',
  '42501',
  'permission denied for table profiles',
  'anon cannot read profiles'
);
reset role;

-- 10. The trigger keeps email in sync when the auth user changes.
update auth.users
set email = 'admin-p-renamed@example.test'
where id = '21000000-0000-0000-0000-000000000001';

select is(
  (select email from public.profiles where id = '21000000-0000-0000-0000-000000000001'),
  'admin-p-renamed@example.test',
  'profile email follows auth.users'
);

-- 11. No FOR ALL policy on profiles.
select is(
  (select count(*)::integer from pg_policies
    where schemaname='public' and tablename='profiles' and cmd='ALL'),
  0,
  'profiles has no FOR ALL policy'
);

select * from finish();
rollback;
