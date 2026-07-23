create policy "admin can manage own restaurant categories"
  on menu_categories for all
  using (exists (
    select 1 from staff
    where staff.restaurant_id = menu_categories.restaurant_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  ))
  with check (exists (
    select 1 from staff
    where staff.restaurant_id = menu_categories.restaurant_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  ));

create policy "admin can manage own restaurant items"
  on menu_items for all
  using (exists (
    select 1 from menu_categories
    join staff on staff.restaurant_id = menu_categories.restaurant_id
    where menu_categories.id = menu_items.category_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  ))
  with check (exists (
    select 1 from menu_categories
    join staff on staff.restaurant_id = menu_categories.restaurant_id
    where menu_categories.id = menu_items.category_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  ));

create policy "admin can manage own restaurant tables"
  on tables for all
  using (exists (
    select 1 from staff
    where staff.restaurant_id = tables.restaurant_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  ))
  with check (exists (
    select 1 from staff
    where staff.restaurant_id = tables.restaurant_id
    and staff.auth_user_id = auth.uid()
    and staff.role = 'admin'
  ));

create policy "admin can read own restaurant staff"
  on staff for select
  using (exists (
    select 1 from staff as admin_staff
    where admin_staff.restaurant_id = staff.restaurant_id
    and admin_staff.auth_user_id = auth.uid()
    and admin_staff.role = 'admin'
  ));
