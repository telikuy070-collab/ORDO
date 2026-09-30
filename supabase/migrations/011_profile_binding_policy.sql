-- 011_profile_binding_policy.sql
--
-- Relaxes the profile binding introduced in 010.
--
-- 010 raised an error when a user was granted a role in a second tenant. That
-- was too strict: the platform owner role is expected to hold memberships in
-- several tenants, and current_tenant_id() is deliberately fail-closed for
-- that case (zero or several distinct memberships resolve to NULL).
--
-- Tenant hopping is already blocked by RLS: user_roles UPDATE requires
-- tenant_id = current_tenant_id() in both USING and WITH CHECK, so a
-- tenant_admin can never move a row into another tenant. The profile trigger
-- therefore only has to keep the binding stable, not police it.
--
-- A profile binds to the first tenant it sees and is never re-bound, which
-- keeps the derived field deterministic.

create or replace function public.handle_role_assignment()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.profiles
  set tenant_id = new.tenant_id,
      updated_at = now()
  where id = new.user_id
    and tenant_id is null;

  return new;
end;
$$;

revoke all on function public.handle_role_assignment() from public;
revoke all on function public.handle_role_assignment() from anon;
revoke all on function public.handle_role_assignment() from authenticated;

drop trigger if exists on_user_role_assigned on public.user_roles;
create trigger on_user_role_assigned
  after insert or update of tenant_id on public.user_roles
  for each row execute function public.handle_role_assignment();
