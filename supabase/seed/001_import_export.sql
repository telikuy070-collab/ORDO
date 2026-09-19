-- Seed data for local development and staging.
-- Insert tenants, users, and sample import/export jobs.
-- RLS is enforced, so these inserts run as the service role.

insert into public.tenants (id, name, code) values
  ('11111111-1111-1111-1111-111111111111', 'YSF Medical College', 'ysf'),
  ('22222222-2222-2222-2222-222222222222', 'Demo College', 'demo')
on conflict (id) do nothing;

-- NOTE: real user_ids come from auth.users (Supabase Auth).
-- These rows are placeholders for local testing only.
insert into public.import_jobs (tenant_id, file_name, file_size, format, status, total_rows)
values
  ('11111111-1111-1111-1111-111111111111', 'schedule.xlsx', 12345, 'xlsx', 'completed', 240),
  ('22222222-2222-2222-2222-222222222222', 'groups.csv', 4321, 'csv', 'pending', 48)
on conflict do nothing;

insert into public.export_jobs (tenant_id, format, status, entity, filter)
values
  ('11111111-1111-1111-1111-111111111111', 'xlsx', 'completed', 'schedule', '{}'),
  ('22222222-2222-2222-2222-222222222222', 'csv', 'pending', 'teachers', '{}')
on conflict do nothing;