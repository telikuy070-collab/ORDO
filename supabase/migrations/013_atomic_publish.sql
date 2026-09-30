-- 013_atomic_publish.sql
-- Atomic, conflict-checked publication of a schedule version.
--
-- The publication repository performed a plain insert into published_schedules.
-- That has three problems:
--   1. no hard-conflict check, so a conflicting version could be published
--   2. insert and schedule status update were separate statements, so a failure
--      between them left the schedule marked draft but already published
--   3. nothing serialised concurrent publishes of the same schedule
--
-- This adds a single statement that does all of it, and takes a row lock on the
-- schedule so two publishes cannot interleave.
--
-- SECURITY INVOKER on purpose: the caller's RLS policies are the authority for
-- tenant access. A SECURITY DEFINER function would bypass them, and the only
-- thing it needs to do is insert and update rows the schedule_owner is already
-- allowed to touch.

-- ---------------------------------------------------------------------------
-- 1. Repair schedules.updated_at
-- ---------------------------------------------------------------------------
-- 005 attaches set_updated_at to public.schedules, but the table never had an
-- updated_at column. The function writes new.updated_at, so every UPDATE on
-- schedules raised "record new has no field updated_at". The trigger itself
-- is created without complaint, so the breakage only showed on the first write.

alter table public.schedules
  add column if not exists updated_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- 2. Function
-- ---------------------------------------------------------------------------

create or replace function public.publish_schedule_version(p_version_id uuid)
returns jsonb
language plpgsql
volatile
set search_path = pg_catalog, public
as $$
declare
  v_version public.schedule_versions%rowtype;
  v_schedule public.schedules%rowtype;
  v_actor uuid;
  v_hard integer;
  v_publication_id uuid;
  v_affected integer;
begin
  if p_version_id is null then
    raise exception using
      errcode = 'OR001',
      message = 'version id is required';
  end if;

  -- Read-gated lookup first. SELECT ... FOR UPDATE is deliberately not used to
  -- take the lock: PostgreSQL checks a locking SELECT against the UPDATE
  -- policy, which would report a permission failure as "row not found" and
  -- hide the real cause.
  select * into v_version
  from public.schedule_versions as sv
  where sv.id = p_version_id
    and sv.tenant_id = public.current_tenant_id();

  if not found then
    raise exception using
      errcode = 'OR001',
      message = 'schedule version not found in the active tenant';
  end if;

  select * into v_schedule
  from public.schedules as s
  where s.id = v_version.schedule_id;

  if not found then
    raise exception using
      errcode = 'OR001',
      message = 'schedule not found in the active tenant';
  end if;

  v_actor := auth.uid();
  if v_actor is null then
    raise exception using
      errcode = 'OR001',
      message = 'publication requires an authenticated user';
  end if;

  -- This UPDATE is the lock: it takes the schedule row lock before the
  -- conflict check, so two concurrent publishes cannot both pass the check and
  -- both insert. Being write-gated it also produces the correct error for a
  -- caller without publish rights. If a later step raises, this is rolled back
  -- with the rest of the function.
  update public.schedules
  set status = 'published',
      published_at = now()
  where id = v_schedule.id;

  get diagnostics v_affected = row_count;
  if v_affected = 0 then
    raise exception using
      errcode = 'OR001',
      message = 'schedule is not writable in the active tenant';
  end if;

  select count(*) into v_hard
  from public.conflicts as c
  where c.version_id = p_version_id
    and c.severity = 'hard';

  if v_hard > 0 then
    raise exception using
      errcode = 'OR002',
      message = format('%s hard conflict(s) block publication of version %s', v_hard, p_version_id);
  end if;

  -- published_schedules is append-only and allows one row per version, so
  -- republishing the same version is a no-op rather than a constraint
  -- violation. The status update above already made the schedule consistent.
  select ps.id into v_publication_id
  from public.published_schedules as ps
  where ps.schedule_version_id = p_version_id
  order by ps.published_at
  limit 1;

  if v_publication_id is null then
    insert into public.published_schedules (tenant_id, schedule_version_id, published_by)
    values (v_version.tenant_id, p_version_id, v_actor)
    returning id into v_publication_id;
  end if;

  return jsonb_build_object(
    'publicationId', v_publication_id,
    'versionId', p_version_id,
    'scheduleId', v_version.schedule_id
  );
end;
$$;

revoke all on function public.publish_schedule_version(uuid) from public;
grant execute on function public.publish_schedule_version(uuid) to authenticated;

comment on function public.publish_schedule_version(uuid) is
  'Publishes a schedule version atomically. Raises OR001 when the version is not visible in the active tenant and OR002 when hard conflicts block publication.';
