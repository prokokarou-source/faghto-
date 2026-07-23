create policy "staff can read own restaurant requests"
  on requests for select
  using (exists (
    select 1 from tables
    join staff on staff.restaurant_id = tables.restaurant_id
    where tables.id = requests.table_id
    and staff.auth_user_id = auth.uid()
  ));

create policy "staff can update own restaurant requests"
  on requests for update
  using (exists (
    select 1 from tables
    join staff on staff.restaurant_id = tables.restaurant_id
    where tables.id = requests.table_id
    and staff.auth_user_id = auth.uid()
  ));

create policy "staff can read own restaurant tables"
  on tables for select
  using (exists (
    select 1 from staff
    where staff.restaurant_id = tables.restaurant_id
    and staff.auth_user_id = auth.uid()
  ));

alter publication supabase_realtime add table requests;
