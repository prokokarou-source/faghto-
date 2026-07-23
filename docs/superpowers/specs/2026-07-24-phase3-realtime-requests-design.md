# Phase 3 Design: Real-time Call-Waiter / Bill Flow

## Context

Phases 1-2 are done: auth + RLS skeleton, and the public menu view. This phase adds the
core interaction: a customer on `/menu/[slug]?table=<qr_token>` taps "Κάλεσε σερβιτόρο" or
"Ζήτα λογαριασμό", a `requests` row is created, and the waiter dashboard at `/staff` shows
it live via Supabase Realtime, with acknowledge/resolve actions.

## Scope decisions

- **Table identification becomes real**: the QR code URL changes from `?table=<label>`
  (cosmetic, Phase 2) to `?table=<qr_token>` (the actual unguessable token from the
  `tables` table). This was deferred from Phase 2 specifically because it's needed now.
- **No open `tables` RLS policy**: per the Phase 2 design rationale, a public `select`
  policy on `tables` would let anyone enumerate every table's `qr_token` for every
  restaurant. Instead, table lookup + request creation goes through a **Next.js Route
  Handler** (`POST /api/requests`) using the **service role key** server-side — the
  browser never talks to Supabase directly for this write. This also gives us a single
  place to add rate limiting (required by the original spec).
- **Rate limiting**: in-memory sliding-window limiter inside the route handler, keyed by
  `qr_token` — max 1 request of a given type per table per 30 seconds. In-memory is
  intentionally simple for now (a single Next.js server instance in dev/small deployments);
  swapping in a persistent store (Redis/Upstash) is a one-file change later if the app
  scales to multiple server instances, not a Phase 3 concern.
- **Waiter dashboard realtime**: Supabase Realtime Postgres Changes subscription scoped to
  `requests` rows whose `table_id` belongs to the waiter's `restaurant_id`. Supabase
  Realtime does not support server-side filtering by a joined column, so the client
  subscribes to all `requests` INSERT/UPDATE events and filters client-side against a
  precomputed set of the restaurant's table IDs (fetched once on mount). This is safe
  because RLS still governs what the subscription can actually deliver — but request rows
  need a `select` RLS policy scoped to staff of the owning restaurant first (added this
  phase, join through `tables`).
- **Acknowledge/resolve**: buttons in the waiter dashboard update `requests.status` (and
  set `resolved_at` on resolve) via a direct Supabase client call — this one *is* a normal
  authenticated write, RLS-scoped to staff of the same restaurant, no route handler needed
  (unlike the anonymous customer-side insert).

## RLS additions

```sql
-- staff can see requests for tables in their own restaurant
create policy "staff can read own restaurant requests"
  on requests for select
  using (exists (
    select 1 from tables
    join staff on staff.restaurant_id = tables.restaurant_id
    where tables.id = requests.table_id
    and staff.auth_user_id = auth.uid()
  ));

-- staff can update (acknowledge/resolve) requests for their own restaurant
create policy "staff can update own restaurant requests"
  on requests for update
  using (exists (
    select 1 from tables
    join staff on staff.restaurant_id = tables.restaurant_id
    where tables.id = requests.table_id
    and staff.auth_user_id = auth.uid()
  ));
```

No `insert` policy is added for `requests` — the only writer is the route handler, which
uses the service role key and bypasses RLS entirely. This is intentional: it keeps
"who can create a request" enforced in one reviewable place (server code + rate limiter)
instead of a `using`/`with check` RLS expression trying to validate an anonymous request.

## API

`POST /api/requests`
- Body: `{ qrToken: string, type: 'call_waiter' | 'bill' }`
- Validates: `qrToken` is a valid uuid, `type` is one of the two allowed values, the token
  matches an existing table (service-role lookup) — 404 if not.
- Rate limit: 429 if the same `qrToken` posted the same `type` in the last 30s.
- On success: inserts a `requests` row (`status = 'pending'`), returns `201`.
- No auth required (this is the public customer action) — protected instead by the
  unguessable `qrToken` plus the rate limiter.

## Components

- `lib/requests/rate-limit.ts` — pure in-memory limiter, unit tested (given a key and a
  clock function, decide allow/deny; the route handler wires in `Date.now`).
- `app/api/requests/route.ts` — the Route Handler described above.
- `components/menu/RequestButtons.tsx` — client component, two buttons, posts to the API,
  shows a short "Ζητήθηκε!" confirmation state per button (disabled for a few seconds to
  discourage accidental double-taps — the real spam guard is server-side).
- `lib/requests/get-restaurant-requests.ts` — server-side initial fetch of pending/
  acknowledged requests + their table labels for the waiter dashboard.
- `components/staff/RequestsDashboard.tsx` — client component: renders the initial list,
  subscribes to Realtime changes, updates local state, exposes acknowledge/resolve
  buttons that call Supabase directly.

## Out of scope for Phase 3

- Admin analytics on requests (average response time) — Phase 4.
- Persistent (non-in-memory) rate limiting — noted above, deferred.
- Push/sound notifications for waiters — nice-to-have, not requested.
