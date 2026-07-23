# Phase 3: Real-time Call-Waiter/Bill Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers on the menu page can tap "Κάλεσε σερβιτόρο" / "Ζήτα λογαριασμό"; staff see it appear live on `/staff` and can acknowledge/resolve it.

**Architecture:** The anonymous write (creating a request) goes through a Next.js Route Handler using the service role key — never a direct anon-key insert — so table lookup, validation, and rate limiting all live in one reviewable server-side place. The staff dashboard reads its initial list server-side, then subscribes to Supabase Realtime Postgres Changes on `requests`; Realtime honors RLS, so the subscription only ever delivers rows the signed-in staff member is allowed to see — no client-side restaurant filtering needed.

**Tech Stack:** Same as Phases 1-2, plus Supabase Realtime (`@supabase/ssr`/`@supabase/supabase-js` already installed — no new dependency).

## Global Constraints

- No `insert` RLS policy on `requests` — the only writer is the route handler (service role), which is also where the rate limiter lives.
- No public `select` policy on `tables` — table lookups by `qr_token` happen server-side via the service role client only.
- Full design context: `docs/superpowers/specs/2026-07-24-phase3-realtime-requests-design.md` (note: that doc's Realtime section says filtering happens client-side; this plan corrects that — Realtime Postgres Changes honors RLS, so the "staff can read own restaurant requests" policy from Task 1 alone scopes what the subscription delivers).

---

## File Structure

```
faghto/
  supabase/migrations/0003_realtime_requests.sql   (new)
  scripts/seed-tables.ts                            (new)
  lib/requests/rate-limit.ts                         (new)
  lib/requests/rate-limit.test.ts                     (new)
  lib/requests/get-table-by-qr-token.ts                (new)
  lib/requests/get-restaurant-requests.ts               (new)
  app/api/requests/route.ts                             (new)
  components/menu/RequestButtons.tsx                     (new)
  components/staff/RequestsDashboard.tsx                  (new)
  app/menu/[slug]/page.tsx                                 (modify)
  components/menu/MenuBrowser.tsx                           (modify)
  app/staff/page.tsx                                         (modify)
```

---

### Task 1: RLS policies + enable Realtime on `requests`

**Files:**
- Create: `supabase/migrations/0003_realtime_requests.sql`

**Interfaces:**
- Produces: staff can `select`/`update` requests and `select` tables scoped to their own restaurant; `requests` change events are broadcast over Realtime.

- [ ] **Step 1: Write `supabase/migrations/0003_realtime_requests.sql`**

```sql
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
```

- [ ] **Step 2: Apply it (manual, Supabase dashboard SQL Editor)**

Paste and run. Expected: "Success. No rows returned."
If `alter publication` errors because the table is already a member, that's fine — it
means Realtime was already on for `requests`; ignore that specific error and re-run just
the three `create policy` statements.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_realtime_requests.sql
git commit -m "feat: add staff RLS policies for requests/tables and enable Realtime"
```

---

### Task 2: Seed demo tables

**Files:**
- Create: `scripts/seed-tables.ts`

**Interfaces:**
- Produces: 2 rows in `tables` for `demo-taverna`, printed with their real `qr_token` and a
  ready-to-open menu URL — needed for Task 9's manual test (the `?table=` param must now be
  a real `qr_token`, not a plain label, per the Phase 2→3 design change).

- [ ] **Step 1: Write `scripts/seed-tables.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabase = createClient(url, serviceRoleKey)

async function seedTables() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'demo-taverna')
    .single()

  if (restaurantError || !restaurant) {
    throw new Error('demo-taverna restaurant not found — run `npm run seed` first')
  }

  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .insert([
      { restaurant_id: restaurant.id, label: '12' },
      { restaurant_id: restaurant.id, label: '7' },
    ])
    .select('id, label, qr_token')

  if (tablesError || !tables) throw tablesError

  console.log('Created tables:')
  tables.forEach((table) => {
    console.log(`  Τραπέζι ${table.label} -> qr_token: ${table.qr_token}`)
    console.log(`  Menu URL: http://localhost:3000/menu/demo-taverna?table=${table.qr_token}`)
  })
}

seedTables()
  .then(() => {
    console.log('Table seed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Table seed failed:', err)
    process.exit(1)
  })
```

- [ ] **Step 2: Add the npm script**

Edit `package.json`, add to `"scripts"`:

```json
"seed:tables": "tsx scripts/seed-tables.ts"
```

- [ ] **Step 3: Run it and keep the printed URLs handy**

Run: `npm run seed:tables`
Expected: prints two "Τραπέζι X -> qr_token: ..." lines with menu URLs. Copy Τραπέζι 12's
URL — Task 9 uses it.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-tables.ts package.json
git commit -m "feat: add demo table seed script"
```

---

### Task 3: Rate limiter (pure class, TDD)

**Files:**
- Create: `lib/requests/rate-limit.ts`
- Test: `lib/requests/rate-limit.test.ts`

**Interfaces:**
- Produces: `class RateLimiter { constructor(windowMs: number); attempt(key: string, now: number): boolean }`. Used by Task 5's route handler.

- [ ] **Step 1: Write the failing test**

```ts
// lib/requests/rate-limit.test.ts
import { describe, expect, it } from 'vitest'
import { RateLimiter } from './rate-limit'

describe('RateLimiter', () => {
  it('allows the first attempt for a key', () => {
    const limiter = new RateLimiter(30_000)
    expect(limiter.attempt('table-1:call_waiter', 1000)).toBe(true)
  })

  it('denies a second attempt within the window', () => {
    const limiter = new RateLimiter(30_000)
    limiter.attempt('table-1:call_waiter', 1000)
    expect(limiter.attempt('table-1:call_waiter', 1000 + 10_000)).toBe(false)
  })

  it('allows a second attempt after the window passes', () => {
    const limiter = new RateLimiter(30_000)
    limiter.attempt('table-1:call_waiter', 1000)
    expect(limiter.attempt('table-1:call_waiter', 1000 + 30_001)).toBe(true)
  })

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter(30_000)
    limiter.attempt('table-1:call_waiter', 1000)
    expect(limiter.attempt('table-1:bill', 1000)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/requests/rate-limit.test.ts`
Expected: FAIL — `Cannot find module './rate-limit'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/requests/rate-limit.ts
export class RateLimiter {
  private lastRequestAt = new Map<string, number>()

  constructor(private windowMs: number) {}

  attempt(key: string, now: number): boolean {
    const last = this.lastRequestAt.get(key)
    if (last !== undefined && now - last < this.windowMs) {
      return false
    }
    this.lastRequestAt.set(key, now)
    return true
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/requests/rate-limit.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/requests/rate-limit.ts lib/requests/rate-limit.test.ts
git commit -m "feat: add in-memory rate limiter for the requests endpoint"
```

---

### Task 4: Table lookup by QR token (service role)

**Files:**
- Create: `lib/requests/get-table-by-qr-token.ts`

**Interfaces:**
- Produces: `getTableByQrToken(qrToken: string, restaurantId: string): Promise<{ id: string; label: string } | null>`. Used by Task 5 (route handler) and the menu page (Task 6).

- [ ] **Step 1: Write `lib/requests/get-table-by-qr-token.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/env'

export async function getTableByQrToken(
  qrToken: string,
  restaurantId: string
): Promise<{ id: string; label: string } | null> {
  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRoleKey) return null

  const supabase = createClient(url, serviceRoleKey)

  const { data, error } = await supabase
    .from('tables')
    .select('id, label')
    .eq('qr_token', qrToken)
    .eq('restaurant_id', restaurantId)
    .single()

  if (error || !data) return null

  return data
}
```

This uses the service role client deliberately (not `lib/supabase/server.ts`) — there is no
public RLS policy that would let the anon-key client resolve a `qr_token` to a row, by
design (see Phase 3 design doc). This function is the one narrow, server-only path allowed
to do that lookup.

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add lib/requests/get-table-by-qr-token.ts
git commit -m "feat: add service-role table lookup by qr_token"
```

---

### Task 5: `POST /api/requests` route handler

**Files:**
- Create: `app/api/requests/route.ts`

**Interfaces:**
- Consumes: `RateLimiter` (Task 3), `getSupabaseEnv` (Phase 1).
- Produces: the endpoint Task 6's `RequestButtons` posts to.

- [ ] **Step 1: Write `app/api/requests/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/lib/env'
import { RateLimiter } from '@/lib/requests/rate-limit'

const limiter = new RateLimiter(30_000)

const VALID_TYPES = new Set(['call_waiter', 'bill'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { qrToken, type } = (body ?? {}) as { qrToken?: unknown; type?: unknown }

  if (typeof qrToken !== 'string' || !UUID_RE.test(qrToken)) {
    return NextResponse.json({ error: 'Invalid qrToken' }, { status: 400 })
  }

  if (typeof type !== 'string' || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  if (!limiter.attempt(`${qrToken}:${type}`, Date.now())) {
    return NextResponse.json(
      { error: 'Too many requests, please wait a moment' },
      { status: 429 }
    )
  }

  const { url } = getSupabaseEnv()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const supabase = createClient(url, serviceRoleKey)

  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id')
    .eq('qr_token', qrToken)
    .single()

  if (tableError || !table) {
    return NextResponse.json({ error: 'Unknown table' }, { status: 404 })
  }

  const { error: insertError } = await supabase
    .from('requests')
    .insert({ table_id: table.id, type })

  if (insertError) {
    return NextResponse.json({ error: 'Could not create request' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`, route list includes `/api/requests`.

- [ ] **Step 3: Commit**

```bash
git add app/api/requests
git commit -m "feat: add rate-limited requests API endpoint"
```

---

### Task 6: Request buttons on the menu page

**Files:**
- Create: `components/menu/RequestButtons.tsx`
- Modify: `components/menu/MenuBrowser.tsx`
- Modify: `app/menu/[slug]/page.tsx`

**Interfaces:**
- Consumes: `POST /api/requests` (Task 5), `getTableByQrToken` (Task 4).
- Produces: visible call-waiter/bill buttons whenever the menu URL carries a valid
  `?table=<qr_token>`.

- [ ] **Step 1: Write `components/menu/RequestButtons.tsx`**

```tsx
'use client'

import { useState } from 'react'

type RequestType = 'call_waiter' | 'bill'

const REQUEST_LABELS: Record<RequestType, string> = {
  call_waiter: 'Κάλεσε σερβιτόρο',
  bill: 'Ζήτα λογαριασμό',
}

export function RequestButtons({ qrToken }: { qrToken: string }) {
  const [sentType, setSentType] = useState<RequestType | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function sendRequest(type: RequestType) {
    setError(null)
    const response = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrToken, type }),
    })

    if (response.status === 429) {
      setError('Το ζήτησες ήδη πρόσφατα — περίμενε λίγο.')
      return
    }

    if (!response.ok) {
      setError('Κάτι πήγε στραβά, δοκίμασε ξανά.')
      return
    }

    setSentType(type)
    setTimeout(() => setSentType(null), 5000)
  }

  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white p-4">
      {error && <p className="mb-2 text-center text-sm text-red-600">{error}</p>}
      <div className="mx-auto flex max-w-2xl gap-3">
        {(['call_waiter', 'bill'] as const).map((type) => (
          <button
            key={type}
            onClick={() => sendRequest(type)}
            disabled={sentType === type}
            className="flex-1 rounded bg-gray-900 py-3 text-white disabled:opacity-50"
          >
            {sentType === type ? 'Ζητήθηκε!' : REQUEST_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Modify `components/menu/MenuBrowser.tsx`**

Replace the props type and the outer `<main>` element:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { filterItemsByTags, type MenuItem } from '@/lib/menu/filter-items'
import { RequestButtons } from '@/components/menu/RequestButtons'

type MenuCategory = {
  id: string
  name: string
  items: MenuItem[]
}

export function MenuBrowser({
  restaurantName,
  tableLabel,
  qrToken,
  categories,
}: {
  restaurantName: string
  tableLabel: string | null
  qrToken: string | null
  categories: MenuCategory[]
}) {
```

And change the return statement's `<main>` opening tag and closing to add bottom padding
and the buttons:

```tsx
  return (
    <main className="mx-auto max-w-2xl p-6 pb-28">
```

(the rest of the JSX body — header, tag filter, category sections — stays exactly as
Phase 2 left it)

Then just before the final `</main>`, add:

```tsx
      {qrToken && <RequestButtons qrToken={qrToken} />}
    </main>
```

- [ ] **Step 3: Modify `app/menu/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getRestaurantMenu } from '@/lib/menu/get-restaurant-menu'
import { getTableByQrToken } from '@/lib/requests/get-table-by-qr-token'
import { MenuBrowser } from '@/components/menu/MenuBrowser'

export const dynamic = 'force-dynamic'

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams: { table?: string }
}) {
  const menu = await getRestaurantMenu(params.slug)

  if (!menu) {
    notFound()
  }

  const table = searchParams.table
    ? await getTableByQrToken(searchParams.table, menu.restaurant.id)
    : null

  return (
    <MenuBrowser
      restaurantName={menu.restaurant.name}
      tableLabel={table?.label ?? null}
      qrToken={table ? searchParams.table! : null}
      categories={menu.categories}
    />
  )
}
```

- [ ] **Step 4: Run all unit tests and verify the build**

Run: `npm test` then `npm run build`
Expected: all tests pass, build compiles successfully.

- [ ] **Step 5: Commit**

```bash
git add components/menu app/menu/[slug]/page.tsx
git commit -m "feat: add call-waiter/bill buttons to the menu page"
```

---

### Task 7: Staff dashboard data fetcher

**Files:**
- Create: `lib/requests/get-restaurant-requests.ts`

**Interfaces:**
- Produces: `type StaffRequest = { id: string; tableId: string; tableLabel: string; type: 'call_waiter' | 'bill'; status: 'pending' | 'acknowledged' | 'resolved'; createdAt: string }` and `getRestaurantRequests(restaurantId: string): Promise<StaffRequest[]>`. Used by Task 8.

- [ ] **Step 1: Write `lib/requests/get-restaurant-requests.ts`**

```ts
import { createClient } from '@/lib/supabase/server'

export type StaffRequest = {
  id: string
  tableId: string
  tableLabel: string
  type: 'call_waiter' | 'bill'
  status: 'pending' | 'acknowledged' | 'resolved'
  createdAt: string
}

export async function getRestaurantRequests(restaurantId: string): Promise<StaffRequest[]> {
  const supabase = await createClient()

  const { data: tables, error: tablesError } = await supabase
    .from('tables')
    .select('id, label')
    .eq('restaurant_id', restaurantId)

  if (tablesError || !tables || tables.length === 0) return []

  const tableLabelById = new Map(tables.map((table) => [table.id, table.label]))
  const tableIds = tables.map((table) => table.id)

  const { data: requests, error: requestsError } = await supabase
    .from('requests')
    .select('id, table_id, type, status, created_at')
    .in('table_id', tableIds)
    .neq('status', 'resolved')
    .order('created_at', { ascending: true })

  if (requestsError || !requests) return []

  return requests.map((request) => ({
    id: request.id,
    tableId: request.table_id,
    tableLabel: tableLabelById.get(request.table_id) ?? '?',
    type: request.type as StaffRequest['type'],
    status: request.status as StaffRequest['status'],
    createdAt: request.created_at,
  }))
}
```

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add lib/requests/get-restaurant-requests.ts
git commit -m "feat: add staff-side requests data fetcher"
```

---

### Task 8: Realtime staff dashboard

**Files:**
- Create: `components/staff/RequestsDashboard.tsx`
- Modify: `app/staff/page.tsx`

**Interfaces:**
- Consumes: `type StaffRequest` and `getRestaurantRequests` (Task 7), `createClient()` from `lib/supabase/client.ts` (Phase 1), `getStaffRole()` (Phase 1).
- Produces: the live-updating dashboard at `/staff`.

- [ ] **Step 1: Write `components/staff/RequestsDashboard.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffRequest } from '@/lib/requests/get-restaurant-requests'

const TYPE_LABELS: Record<StaffRequest['type'], string> = {
  call_waiter: 'Κάλεσε σερβιτόρο',
  bill: 'Ζήτα λογαριασμό',
}

const STATUS_LABELS: Record<StaffRequest['status'], string> = {
  pending: 'Εκκρεμεί',
  acknowledged: 'Σε εξέλιξη',
  resolved: 'Ολοκληρώθηκε',
}

async function fetchOpenRequests(): Promise<StaffRequest[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requests')
    .select('id, table_id, type, status, created_at, tables(label)')
    .neq('status', 'resolved')
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    tableId: row.table_id,
    tableLabel: (row.tables as unknown as { label: string } | null)?.label ?? '?',
    type: row.type as StaffRequest['type'],
    status: row.status as StaffRequest['status'],
    createdAt: row.created_at,
  }))
}

export function RequestsDashboard({ initialRequests }: { initialRequests: StaffRequest[] }) {
  const [requests, setRequests] = useState(initialRequests)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('requests-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async () => {
        setRequests(await fetchOpenRequests())
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function updateStatus(id: string, status: 'acknowledged' | 'resolved') {
    const supabase = createClient()
    const patch: { status: string; resolved_at?: string } = { status }
    if (status === 'resolved') {
      patch.resolved_at = new Date().toISOString()
    }
    await supabase.from('requests').update(patch).eq('id', id)
  }

  if (requests.length === 0) {
    return <p className="text-gray-500">Καμία εκκρεμής ειδοποίηση.</p>
  }

  return (
    <ul className="space-y-3">
      {requests.map((request) => (
        <li
          key={request.id}
          className="flex items-center justify-between rounded border border-gray-200 p-4"
        >
          <div>
            <p className="font-medium text-gray-900">
              Τραπέζι {request.tableLabel} — {TYPE_LABELS[request.type]}
            </p>
            <p className="text-sm text-gray-500">
              {STATUS_LABELS[request.status]} ·{' '}
              {new Date(request.createdAt).toLocaleTimeString('el-GR')}
            </p>
          </div>
          <div className="flex gap-2">
            {request.status === 'pending' && (
              <button
                onClick={() => updateStatus(request.id, 'acknowledged')}
                className="rounded border border-gray-300 px-3 py-1 text-sm"
              >
                Ανέλαβα
              </button>
            )}
            <button
              onClick={() => updateStatus(request.id, 'resolved')}
              className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
            >
              Ολοκληρώθηκε
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Modify `app/staff/page.tsx`**

```tsx
import { getStaffRole } from '@/lib/auth/get-staff-role'
import { getRestaurantRequests } from '@/lib/requests/get-restaurant-requests'
import { RequestsDashboard } from '@/components/staff/RequestsDashboard'

export default async function StaffDashboardPage() {
  const staff = await getStaffRole()
  const requests = staff ? await getRestaurantRequests(staff.restaurantId) : []

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Πίνακας σερβιτόρου</h1>
      <div className="mt-6">
        <RequestsDashboard initialRequests={requests} />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Run all unit tests and verify the build**

Run: `npm test` then `npm run build`
Expected: all tests pass, build compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add components/staff app/staff/page.tsx
git commit -m "feat: add realtime staff requests dashboard"
```

---

### Task 9: Manual end-to-end verification

**Files:** none.

- [ ] **Step 1: Restart the dev server**

Run: `npm run dev`

- [ ] **Step 2: Open two browser windows side by side**

Window A: the Τραπέζι 12 menu URL printed by Task 2's seed script
(`http://localhost:3000/menu/demo-taverna?table=<real qr_token>`).
Window B: logged in as `admin@demo-taverna.test` (or the waiter account) at `/staff`.

- [ ] **Step 3: Trigger a request**

In Window A, tap "Κάλεσε σερβιτόρο".
Expected: button shows "Ζητήθηκε!" and disables for 5s. Within a second or two, Window B's
list shows a new "Τραπέζι 12 — Κάλεσε σερβιτόρο" entry **without reloading the page**.

- [ ] **Step 4: Acknowledge and resolve**

In Window B, click "Ανέλαβα" — status label changes to "Σε εξέλιξη". Click
"Ολοκληρώθηκε" — the row disappears from the list (resolved requests are excluded).

- [ ] **Step 5: Verify rate limiting**

In Window A, tap "Κάλεσε σερβιτόρο" again immediately, then reload the page and tap it
again within 30s of the first tap.
Expected: second tap shows "Το ζήτησες ήδη πρόσφατα — περίμενε λίγο."

---

## Self-Review Notes

- **Spec coverage:** call-waiter/bill buttons (Task 6), realtime staff view (Task 8),
  acknowledge/resolve (Task 8), rate limiting (Task 3/5), no anon `tables` enumeration
  (Task 4's service-role-only lookup, no RLS policy added on `tables` for anon).
- **No placeholders:** every step has literal file contents or an exact command with
  expected output.
- **Type consistency:** `StaffRequest` defined once in `lib/requests/get-restaurant-requests.ts`
  (Task 7), reused as-is by `RequestsDashboard.tsx` (Task 8) for both the initial props and
  the realtime refetch return type.
- **Correction from design doc:** the design doc speculated Realtime would need
  client-side restaurant filtering; this plan uses the simpler, correct behavior (RLS
  scopes what Realtime delivers) instead — noted in Global Constraints so this isn't lost.
