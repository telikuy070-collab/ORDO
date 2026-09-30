-- 012_public_schedule.sql
-- Read-only public contract for the anonymous student app.
--
-- 009 revoked every anon table grant, so the student app can currently read
-- nothing at all. That is the correct security posture, but it leaves the
-- public feature unimplemented. This adds a single allowlisted entry point
-- instead of reopening tables.
--
-- Design:
--   - resolved by tenant code, never by a client-supplied tenant id
--   - returns only the most recently published version
--   - returns no identifiers, emails, phones, conflicts, draft data or
--     internal ids beyond what a timetable needs
--   - unknown or unpublished tenant yields NULL, so the endpoint cannot be
--     used to enumerate which colleges exist

-- ---------------------------------------------------------------------------
-- 1. Function
-- ---------------------------------------------------------------------------

create or replace function public.get_published_schedule(p_tenant_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_tenant_id uuid;
  v_tenant jsonb;
  v_version_id uuid;
  v_published_at timestamptz;
  v_semester jsonb;
  v_lessons jsonb;
begin
  if p_tenant_code is null or btrim(p_tenant_code) = '' then
    return null;
  end if;

  select t.id,
         jsonb_build_object('id', t.id, 'code', t.code, 'name', t.name)
  into v_tenant_id, v_tenant
  from public.tenants as t
  where t.code = lower(btrim(p_tenant_code))
  limit 1;

  if v_tenant_id is null then
    return null;
  end if;

  -- The active schedule is the most recent publication. published_schedules is
  -- append-only, so history is preserved and nothing is overwritten.
  select ps.schedule_version_id, ps.published_at
  into v_version_id, v_published_at
  from public.published_schedules as ps
  where ps.tenant_id = v_tenant_id
  order by ps.published_at desc
  limit 1;

  if v_version_id is null then
    return null;
  end if;

  select jsonb_build_object(
           'id', sem.id,
           'number', sem.number,
           'startDate', sem.start_date,
           'endDate', sem.end_date
         )
  into v_semester
  from public.schedule_versions as sv
  join public.schedules as s on s.id = sv.schedule_id
  join public.semesters as sem on sem.id = s.semester_id
  where sv.id = v_version_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'dayOfWeek', l.day_of_week,
               'pairNumber', l.pair_number,
               'timeStart', l.time_start,
               'timeEnd', l.time_end,
               'weekType', l.week_type,
               'lessonType', l.lesson_type,
               'discipline', d.name,
               'groupCode', g.code,
               'teacherName', t.full_name,
               'roomNumber', r.number,
               'buildingName', b.name
             )
             order by l.day_of_week, l.pair_number, g.code
           ),
           '[]'::jsonb
         )
  into v_lessons
  from public.lessons as l
  join public.groups as g on g.id = l.group_id
  join public.disciplines as d on d.id = l.discipline_id
  join public.teachers as t on t.id = l.teacher_id
  join public.rooms as r on r.id = l.room_id
  join public.buildings as b on b.id = r.building_id
  where l.version_id = v_version_id
    -- A published schedule must not leak data from another tenant even if a
    -- reference was ever corrupted.
    and g.tenant_id = v_tenant_id
    and d.tenant_id = v_tenant_id
    and t.tenant_id = v_tenant_id
    and r.tenant_id = v_tenant_id;

  return jsonb_build_object(
    'tenant', v_tenant,
    'semester', v_semester,
    'publishedAt', v_published_at,
    'lessons', v_lessons
  );
end;
$$;

-- The function is the only thing anon may call, and it exposes no writes.
revoke all on function public.get_published_schedule(text) from public;
revoke all on function public.get_published_schedule(text) from anon;
revoke all on function public.get_published_schedule(text) from authenticated;
grant execute on function public.get_published_schedule(text) to anon, authenticated;

comment on function public.get_published_schedule(text) is
  'Public, read-only timetable payload for a tenant code. Returns null when the tenant is unknown or has no published schedule.';
