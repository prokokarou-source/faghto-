-- Public read access for the customer-facing menu view (Phase 2).
-- NOTE: restaurants.settings becomes publicly readable once this policy
-- exists (RLS is row-level, not column-level) — never store secrets
-- there, only in environment variables.
create policy "public can read restaurants"
  on restaurants for select
  using (true);

create policy "public can read menu categories"
  on menu_categories for select
  using (true);

create policy "public can read available menu items"
  on menu_items for select
  using (available = true);
