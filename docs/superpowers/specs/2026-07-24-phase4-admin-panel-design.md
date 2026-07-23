# Phase 4 Design: Admin Panel

## Context

Phases 1-3 give us auth, the public menu, and the live call-waiter/bill flow. This phase
gives the admin the tools to run the restaurant day-to-day: menu CRUD, table/QR
management, staff invites, and basic analytics.

## Scope decisions

- **Menu CRUD**: add/edit/delete categories and items, toggle availability. Plain HTML
  forms + Next.js Server Actions (no client-side form libraries) — consistent with
  "no framework beyond what's needed" and works without JS for the core actions.
- **Table QR codes**: the `qrcode` npm package renders a QR PNG as a data URL
  server-side (`toDataURL`) — no client JS, no external QR service call (keeps
  table URLs off a third party's servers).
- **Staff invites**: no email delivery (would require SMTP/email-provider setup, out of
  scope). Instead, admin enters an email + role; the server action creates the
  `auth.users` row with a **randomly generated temporary password** via the service
  role client and shows it once in the UI ("copy this, it won't be shown again").
  This mirrors how `scripts/seed.ts` already provisions accounts — just done from the
  UI instead of a script.
- **Menu/table writes go through normal authenticated RLS**, not a route handler —
  unlike Phase 3's anonymous customer writes, these are admin-session writes and RLS is
  the right enforcement layer (new `for all` policies scoped to `role = 'admin'`).
  **Staff invites are the one exception**: creating an `auth.users` row requires the
  Supabase Admin API (service role), so that one action bypasses RLS by necessity, same
  reasoning as Phase 3's `/api/requests` route.
- **Analytics**: requests today (count) + average resolution time for resolved requests,
  computed in JS from a single query — no separate reporting infrastructure needed at
  this scale.

## RLS additions (migration 0004)

```sql
create policy "admin can manage own restaurant categories"
  on menu_categories for all
  using (exists (select 1 from staff where staff.restaurant_id = menu_categories.restaurant_id and staff.auth_user_id = auth.uid() and staff.role = 'admin'))
  with check (exists (select 1 from staff where staff.restaurant_id = menu_categories.restaurant_id and staff.auth_user_id = auth.uid() and staff.role = 'admin'));

create policy "admin can manage own restaurant items"
  on menu_items for all
  using (exists (select 1 from menu_categories join staff on staff.restaurant_id = menu_categories.restaurant_id where menu_categories.id = menu_items.category_id and staff.auth_user_id = auth.uid() and staff.role = 'admin'))
  with check (exists (select 1 from menu_categories join staff on staff.restaurant_id = menu_categories.restaurant_id where menu_categories.id = menu_items.category_id and staff.auth_user_id = auth.uid() and staff.role = 'admin'));

create policy "admin can manage own restaurant tables"
  on tables for all
  using (exists (select 1 from staff where staff.restaurant_id = tables.restaurant_id and staff.auth_user_id = auth.uid() and staff.role = 'admin'))
  with check (exists (select 1 from staff where staff.restaurant_id = tables.restaurant_id and staff.auth_user_id = auth.uid() and staff.role = 'admin'));

create policy "admin can read own restaurant staff"
  on staff for select
  using (exists (select 1 from staff as admin_staff where admin_staff.restaurant_id = staff.restaurant_id and admin_staff.auth_user_id = auth.uid() and admin_staff.role = 'admin'));
```

## Pages

- `app/admin/page.tsx` — analytics overview + nav links to the sections below.
- `app/admin/menu/page.tsx` — categories/items CRUD.
- `app/admin/tables/page.tsx` — table list + QR codes + create/delete.
- `app/admin/staff/page.tsx` — staff list + invite form (client component for the
  one-time password reveal).

## Out of scope

- Editing category names after creation (delete + recreate) — trimmed for time; not a
  data-loss risk since items keep their `category_id` only if the category itself isn't
  deleted.
- Real email delivery for invites.
- Charts/graphs for analytics — numbers only.
