-- Migration 0004's "admin can read own restaurant staff" policy self-references
-- the `staff` table inside its own USING clause, which Postgres detects as
-- infinite recursion (RLS re-evaluates all SELECT policies on `staff`,
-- including this one, for the inner subquery). This broke login for every
-- account, not just admins, because get-staff-role.ts's SELECT on `staff`
-- started erroring for everyone.
--
-- Fix: move the check into a SECURITY DEFINER function. Functions created by
-- the table owner (postgres, the role that runs SQL Editor queries) bypass
-- RLS on their internal queries, so the same lookup no longer re-triggers
-- policy evaluation.

drop policy if exists "admin can read own restaurant staff" on staff;

create or replace function public.is_admin_of_restaurant(target_restaurant_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from staff
    where staff.restaurant_id = target_restaurant_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  );
$$;

create policy "admin can read own restaurant staff"
  on staff for select
  using (public.is_admin_of_restaurant(staff.restaurant_id));
