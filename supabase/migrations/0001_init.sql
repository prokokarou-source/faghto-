create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  label text not null,
  qr_token uuid unique not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);

create table menu_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null,
  tags text[] not null default '{}',
  available boolean not null default true
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('waiter', 'admin')),
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references tables(id) on delete cascade,
  type text not null check (type in ('call_waiter', 'bill')),
  status text not null check (status in ('pending', 'acknowledged', 'resolved')) default 'pending',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table restaurants enable row level security;
alter table tables enable row level security;
alter table menu_categories enable row level security;
alter table menu_items enable row level security;
alter table staff enable row level security;
alter table requests enable row level security;

create policy "staff can read own row"
  on staff for select
  using (auth_user_id = auth.uid());

create policy "staff can read own restaurant"
  on restaurants for select
  using (exists (
    select 1 from staff
    where staff.restaurant_id = restaurants.id
    and staff.auth_user_id = auth.uid()
  ));
