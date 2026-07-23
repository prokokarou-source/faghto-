# Phase 2 Design: Customer Menu View (no real-time)

## Context

Phase 1 (skeleton, auth, RLS) is done and verified. This phase adds the public-facing
page customers see after scanning the table QR code: `/menu/[restaurantSlug]?table=...`.
No "call waiter" / "call bill" buttons yet — those are Phase 3, once real-time is wired up.

## Scope decisions

- **Dietary filters**: no fixed taxonomy. `menu_items.tags` stays freeform `text[]`; the
  filter UI renders whatever unique tags exist across the restaurant's items and lets the
  customer toggle them. Avoids inventing a tag vocabulary the restaurant might not want.
- **Availability**: items with `available = false` are hidden entirely from the customer
  view (not shown grayed out). Simpler, and matches how most QR menus behave.
- **Table identification stays cosmetic in Phase 2**: the `?table=` param is only used to
  *display* a label ("Τραπέζι 12") if present — it is **not** looked up against the
  `tables` table. Reason: a public RLS `select` policy on `tables` would let anyone read
  every table's `qr_token` for every restaurant via the Supabase REST API directly (RLS is
  row-level, not query-shaped — a permissive policy exposes the whole table, not just the
  row the client asked for). That would defeat the unguessable-QR-token design from Phase
  1. Real per-table validation is deferred to Phase 3, where it's needed anyway (to write
  a `requests` row) and will go through a narrow, purpose-built path instead of a blanket
  anon-read policy on `tables`.
- **Unknown restaurant slug** → Next.js `notFound()` (404 page), not a redirect.

## Data access

Two more RLS policies needed (`restaurants`, `menu_categories` already have narrow
staff-only `select` policies from Phase 1 — Postgres OR's multiple permissive policies
together, so adding a public one makes the row visible to everyone in addition to staff):

```sql
create policy "public can read restaurants"
  on restaurants for select
  using (true);

create policy "public can read menu categories"
  on menu_categories for select
  using (true);

create policy "public can read available menu items"
  on menu_items for select
  using (available = true);
```

No policy is added to `tables` (see above — stays fully locked, same as Phase 1).

Caution carried into the migration file as a comment: `restaurants.settings` becomes
publicly readable once this policy exists, since RLS is row- not column-level. Secrets
must never go there (already the rule from Phase 1 — env vars only).

## Components

- `lib/menu/get-restaurant-menu.ts` — server-only data fetcher: one query for the
  restaurant by slug, one nested query for categories → items (`available = true` only).
  Returns `null` if the slug doesn't exist.
- `lib/menu/filter-items.ts` — pure function, unit tested: given items + selected tags,
  returns the filtered list. Used client-side so filtering doesn't re-fetch.
- `app/menu/[slug]/page.tsx` — server component. Calls `getRestaurantMenu(slug)`,
  `notFound()` if `null`, renders `<MenuBrowser>` with the fetched data plus the raw
  `table` search param (display-only).
- `components/menu/MenuBrowser.tsx` — client component. Holds selected-tags state,
  renders the table banner (if present), tag filter chips, and category sections with
  items (name, description, price, tags).

## Seed data

`scripts/seed.ts` gets extended to also insert 2 categories and a handful of items for
`demo-taverna`, so the page has something to show immediately after seeding.

## Out of scope for Phase 2

- Call waiter / call bill buttons and the `requests` table (Phase 3).
- Real per-table validation via `qr_token` (Phase 3).
- Admin CRUD for menu items (Phase 4).
