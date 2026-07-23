# Phase 1: Skeleton + Supabase + Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Working Next.js app with Supabase-backed email/password auth where `/staff` and `/admin` are server-side protected by role, backed by a multi-tenant Postgres schema with RLS.

**Architecture:** Next.js 14 App Router + TypeScript, styled with Tailwind. `@supabase/ssr` provides browser and server Supabase clients; `middleware.ts` enforces "must be logged in" on `/staff/*` and `/admin/*`, and per-section `layout.tsx` files enforce "must have the right role." All schema/RLS lives in one SQL migration applied directly in the Supabase dashboard (no local Supabase CLI/Docker, per design decision).

**Tech Stack:** Next.js 14, TypeScript (strict), Tailwind CSS, @supabase/ssr, @supabase/supabase-js, Vitest (unit tests for pure logic), tsx (run the seed script), npm.

## Global Constraints

- No secrets/API keys hardcoded in source — only via `.env.local` (gitignored), with `.env.local.example` committed as a template with placeholder values.
- `/staff/*` and `/admin/*` must be protected server-side (middleware + layout `redirect()`), never a client-side-only check.
- Row Level Security must be enabled on every table starting from the first migration.
- Auth method is email + password via Supabase Auth — no magic link, no public self-signup in this phase.
- Multi-tenant schema from the start: every table that holds restaurant data carries `restaurant_id` (directly or transitively).
- TypeScript `strict: true`.
- Package manager: npm.
- Full design context: `docs/superpowers/specs/2026-07-23-phase1-skeleton-auth-design.md`.

---

## File Structure

```
faghto/
  app/
    layout.tsx
    page.tsx
    globals.css
    login/page.tsx
    redirect/page.tsx
    staff/layout.tsx
    staff/page.tsx
    admin/layout.tsx
    admin/page.tsx
  lib/
    env.ts
    auth/protected-paths.ts
    auth/get-redirect-path.ts
    auth/get-staff-role.ts
    supabase/client.ts
    supabase/server.ts
  middleware.ts
  scripts/seed.ts
  supabase/migrations/0001_init.sql
  vitest.config.ts
  package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.js, next-env.d.ts
  .env.local.example, .gitignore
```

Testing note: pure logic (`lib/env.ts`, `lib/auth/protected-paths.ts`, `lib/auth/get-redirect-path.ts`) gets real Vitest unit tests. Code that only makes sense wired to a live Supabase project (middleware, Supabase clients, the login page, layouts, the seed script) is verified against the real dev Supabase project created in Task 4, via the manual checklist in Task 10 — mocking the Supabase SDK for these would test the mock, not the integration.

---

### Task 1: Scaffold Next.js + TypeScript + Tailwind project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `.gitignore`

**Interfaces:**
- Produces: a buildable Next.js app (`npm run dev`, `npm run build`) with Tailwind classes available in any `app/**` file, and the `@/*` import alias resolving to the project root.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "faghto",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "seed": "tsx scripts/seed.ts"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.45.4",
    "next": "^14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.15",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig
```

- [ ] **Step 4: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 6: Write `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

- [ ] **Step 7: Write `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Write `app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Faghto',
  description: 'QR menu & table service platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 9: Write `app/page.tsx`**

```tsx
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Faghto</h1>
        <p className="mt-2 text-gray-600">QR menu &amp; table service platform</p>
        <Link href="/login" className="mt-4 inline-block rounded bg-gray-900 px-4 py-2 text-white">
          Σύνδεση προσωπικού
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 10: Write `.gitignore`**

```
node_modules
.next
out
.env.local
.env*.local
*.tsbuildinfo
.DS_Store
npm-debug.log*
```

- [ ] **Step 11: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json`.

- [ ] **Step 12: Verify the app builds**

Run: `npm run build`
Expected: `✓ Compiled successfully` and a route summary listing `/`.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs tailwind.config.ts postcss.config.js next-env.d.ts app .gitignore
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind project"
```

---

### Task 2: Testing setup + environment variable validation

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/env.ts`
- Test: `lib/env.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `getSupabaseEnv(): { url: string; anonKey: string }` — throws `Error` with a clear message if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing. Used by Task 3's Supabase clients and Task 5's middleware.

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 2: Write the failing test**

```ts
// lib/env.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getSupabaseEnv } from './env'

describe('getSupabaseEnv', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('returns url and anonKey when both are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value'

    expect(getSupabaseEnv()).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key-value',
    })
  })

  it('throws a clear error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-value'

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })

  it('throws a clear error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run lib/env.test.ts`
Expected: FAIL — `Cannot find module './env'` (file doesn't exist yet).

- [ ] **Step 4: Write minimal implementation**

```ts
// lib/env.ts
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Check your .env.local file.'
    )
  }

  return { url, anonKey }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run lib/env.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add vitest.config.ts lib/env.ts lib/env.test.ts
git commit -m "feat: add Supabase env var validation"
```

---

### Task 3: Supabase browser and server clients

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv()` from Task 2.
- Produces: `createClient()` (browser, sync) from `lib/supabase/client.ts`, and `createClient()` (server, async) from `lib/supabase/server.ts`. Task 6's `get-staff-role.ts` and Task 8's login page/layouts import these.

- [ ] **Step 1: Write `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from '@/lib/env'

export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
```

- [ ] **Step 2: Write `lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from '@/lib/env'

export async function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Called from a Server Component render; safe to ignore because
          // middleware (Task 5) refreshes the session on every request.
        }
      },
    },
  })
}
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully` (these files aren't imported anywhere yet, so this just checks for syntax/type errors).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase
git commit -m "feat: add Supabase browser and server clients"
```

---

### Task 4: Database schema, RLS, and the real Supabase project

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `.env.local.example`
- Create (not committed): `.env.local`

**Interfaces:**
- Produces: a live Supabase project with the full schema and Phase 1 RLS policies applied, plus local `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Every later task that talks to Supabase depends on this existing.

This task has manual steps outside the codebase — creating the Supabase project requires your own account, so I can't do it for you.

- [ ] **Step 1: Write `supabase/migrations/0001_init.sql`**

```sql
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
```

Note: `tables`, `menu_categories`, `menu_items`, and `requests` have RLS enabled but no policies yet — by default that means **no access at all** through the anon/authenticated Postgres roles (the Service Role key still bypasses RLS for the seed script). That's intentional: Phase 2/3 will add exactly the policies each of those tables needs.

- [ ] **Step 2: Create the Supabase project (manual, your browser)**

1. Go to https://supabase.com, sign in or create an account.
2. Click "New project", pick a name (e.g. `faghto-dev`) and a database password (save it somewhere safe — you won't need it for the app itself, only for direct DB access).
3. Wait for the project to finish provisioning (~2 minutes).

- [ ] **Step 3: Apply the migration (manual, Supabase dashboard)**

1. In the project dashboard, open the **SQL Editor**.
2. Paste the full contents of `supabase/migrations/0001_init.sql`.
3. Click **Run**.
4. Expected: "Success. No rows returned." Check the **Table Editor** to confirm all 6 tables exist.

- [ ] **Step 4: Collect your keys (manual, Supabase dashboard)**

1. Go to **Project Settings → API**.
2. Copy the **Project URL**, the **`anon` `public`** key, and the **`service_role`** key (click "Reveal" — treat this one like a password, it bypasses RLS).

- [ ] **Step 5: Write `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- [ ] **Step 6: Create your real `.env.local` (not committed)**

Create `.env.local` in the project root with the same three keys, filled in with the real values from Step 4.

- [ ] **Step 7: Confirm `.env.local` is ignored**

Run: `git check-ignore .env.local`
Expected: prints `.env.local` (confirms git will not track it).

- [ ] **Step 8: Commit the migration and example file**

```bash
git add supabase/migrations/0001_init.sql .env.local.example
git commit -m "feat: add Phase 1 database schema and RLS policies"
```

---

### Task 5: Protected paths + middleware

**Files:**
- Create: `lib/auth/protected-paths.ts`
- Test: `lib/auth/protected-paths.test.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv()` (Task 2).
- Produces: `isProtectedPath(pathname: string): boolean`. `middleware.ts` redirects unauthenticated requests to `/staff/*` and `/admin/*` to `/login`.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/protected-paths.test.ts
import { describe, expect, it } from 'vitest'
import { isProtectedPath } from './protected-paths'

describe('isProtectedPath', () => {
  it('returns true for /staff and nested paths', () => {
    expect(isProtectedPath('/staff')).toBe(true)
    expect(isProtectedPath('/staff/orders')).toBe(true)
  })

  it('returns true for /admin and nested paths', () => {
    expect(isProtectedPath('/admin')).toBe(true)
    expect(isProtectedPath('/admin/menu')).toBe(true)
  })

  it('returns false for public paths', () => {
    expect(isProtectedPath('/')).toBe(false)
    expect(isProtectedPath('/login')).toBe(false)
    expect(isProtectedPath('/menu/demo-taverna')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/protected-paths.test.ts`
Expected: FAIL — `Cannot find module './protected-paths'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/auth/protected-paths.ts
export function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith('/staff') || pathname.startsWith('/admin')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/protected-paths.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write `middleware.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseEnv } from '@/lib/env'
import { isProtectedPath } from '@/lib/auth/protected-paths'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const { url, anonKey } = getSupabaseEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/staff/:path*', '/admin/:path*'],
}
```

- [ ] **Step 6: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`, and the route summary lists `ƒ Middleware`.

- [ ] **Step 7: Commit**

```bash
git add lib/auth/protected-paths.ts lib/auth/protected-paths.test.ts middleware.ts
git commit -m "feat: add session-check middleware for /staff and /admin"
```

---

### Task 6: Role helpers

**Files:**
- Create: `lib/auth/get-redirect-path.ts`
- Test: `lib/auth/get-redirect-path.test.ts`
- Create: `lib/auth/get-staff-role.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 3).
- Produces: `type StaffRole = 'admin' | 'waiter'`, `getRedirectPathForRole(role: StaffRole): string`, and `getStaffRole(): Promise<{ role: StaffRole; restaurantId: string } | null>`. Used by Task 8's redirect page and Task 9's layouts.

- [ ] **Step 1: Write the failing test**

```ts
// lib/auth/get-redirect-path.test.ts
import { describe, expect, it } from 'vitest'
import { getRedirectPathForRole } from './get-redirect-path'

describe('getRedirectPathForRole', () => {
  it('sends admins to /admin', () => {
    expect(getRedirectPathForRole('admin')).toBe('/admin')
  })

  it('sends waiters to /staff', () => {
    expect(getRedirectPathForRole('waiter')).toBe('/staff')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/auth/get-redirect-path.test.ts`
Expected: FAIL — `Cannot find module './get-redirect-path'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/auth/get-redirect-path.ts
export type StaffRole = 'admin' | 'waiter'

export function getRedirectPathForRole(role: StaffRole): string {
  return role === 'admin' ? '/admin' : '/staff'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/auth/get-redirect-path.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Write `lib/auth/get-staff-role.ts`**

```ts
import { createClient } from '@/lib/supabase/server'
import type { StaffRole } from '@/lib/auth/get-redirect-path'

export async function getStaffRole(): Promise<{ role: StaffRole; restaurantId: string } | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data, error } = await supabase
    .from('staff')
    .select('role, restaurant_id')
    .eq('auth_user_id', user.id)
    .single()

  if (error || !data) return null

  return { role: data.role as StaffRole, restaurantId: data.restaurant_id as string }
}
```

This one isn't unit tested here — it's a thin wrapper around a live Supabase call with no branching logic of its own beyond null-handling, so a unit test would just be re-mocking the Supabase SDK's shape. It's covered by the end-to-end checklist in Task 10.

- [ ] **Step 6: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`

- [ ] **Step 7: Commit**

```bash
git add lib/auth/get-redirect-path.ts lib/auth/get-redirect-path.test.ts lib/auth/get-staff-role.ts
git commit -m "feat: add role lookup and role-to-path helpers"
```

---

### Task 7: Seed script

**Files:**
- Create: `scripts/seed.ts`

**Interfaces:**
- Consumes: `@supabase/supabase-js` directly (not the Task 3 clients — those are request-scoped and unsuitable for a one-off script), `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` (Task 4).
- Produces: one row in `restaurants` (slug `demo-taverna`) and two rows in `staff` (`admin@demo-taverna.test` / admin, `waiter@demo-taverna.test` / waiter), both with password `password123`. Task 10's manual checklist logs in with these.

- [ ] **Step 1: Write `scripts/seed.ts`**

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

async function seed() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({ name: 'Demo Taverna', slug: 'demo-taverna' })
    .select()
    .single()

  if (restaurantError) throw restaurantError
  console.log('Created restaurant:', restaurant.id)

  const staffAccounts = [
    { email: 'admin@demo-taverna.test', password: 'password123', role: 'admin' as const },
    { email: 'waiter@demo-taverna.test', password: 'password123', role: 'waiter' as const },
  ]

  for (const account of staffAccounts) {
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
    })

    if (authError) throw authError

    const { error: staffError } = await supabase.from('staff').insert({
      restaurant_id: restaurant.id,
      auth_user_id: authUser.user.id,
      role: account.role,
    })

    if (staffError) throw staffError
    console.log(`Created ${account.role}:`, account.email)
  }
}

seed()
  .then(() => {
    console.log('Seed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
```

- [ ] **Step 2: Add `dotenv` (needed because standalone scripts don't get Next.js's automatic `.env.local` loading)**

Run: `npm install --save-dev dotenv`
Expected: added to `devDependencies`.

- [ ] **Step 3: Run the seed script against your real Supabase project**

Run: `npm run seed`
Expected: prints `Created restaurant: <uuid>`, `Created admin: admin@demo-taverna.test`, `Created waiter: waiter@demo-taverna.test`, `Seed complete.`

- [ ] **Step 4: Confirm in the Supabase dashboard**

Open **Table Editor → restaurants**: one row, slug `demo-taverna`. Open **Table Editor → staff**: two rows. Open **Authentication → Users**: two confirmed users.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat: add demo restaurant/staff seed script"
```

---

### Task 8: Login page + role redirect page

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/redirect/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/client.ts` (Task 3), `getStaffRole()` and `getRedirectPathForRole()` (Task 6).
- Produces: a working login form that signs in via Supabase Auth, then hands off to `/redirect`, which sends admins to `/admin` and waiters to `/staff`.

- [ ] **Step 1: Write `app/login/page.tsx`**

```tsx
'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Λάθος email ή κωδικός.')
      setLoading(false)
      return
    }

    router.push('/redirect')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-gray-900">Σύνδεση προσωπικού</h1>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Κωδικός
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50"
        >
          {loading ? 'Σύνδεση...' : 'Σύνδεση'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Write `app/redirect/page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getStaffRole } from '@/lib/auth/get-staff-role'
import { getRedirectPathForRole } from '@/lib/auth/get-redirect-path'

export default async function RedirectPage() {
  const staff = await getStaffRole()

  if (!staff) {
    redirect('/login')
  }

  redirect(getRedirectPathForRole(staff.role))
}
```

- [ ] **Step 3: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`, route list includes `/login` and `/redirect`.

- [ ] **Step 4: Commit**

```bash
git add app/login app/redirect
git commit -m "feat: add login page and role-based redirect"
```

---

### Task 9: Staff/Admin layouts + placeholder dashboards

**Files:**
- Create: `app/staff/layout.tsx`
- Create: `app/staff/page.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`

**Interfaces:**
- Consumes: `getStaffRole()` (Task 6).
- Produces: `/staff` reachable by any logged-in staff member, `/admin` reachable only by `role === 'admin'` — both `redirect('/login')` otherwise.

- [ ] **Step 1: Write `app/staff/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getStaffRole } from '@/lib/auth/get-staff-role'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffRole()

  if (!staff) {
    redirect('/login')
  }

  return <>{children}</>
}
```

- [ ] **Step 2: Write `app/staff/page.tsx`**

```tsx
export default function StaffDashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Πίνακας σερβιτόρου</h1>
      <p className="mt-2 text-gray-600">
        Εδώ θα εμφανίζονται οι ζωντανές ειδοποιήσεις τραπεζιών (έρχεται στη Φάση 3).
      </p>
    </main>
  )
}
```

- [ ] **Step 3: Write `app/admin/layout.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { getStaffRole } from '@/lib/auth/get-staff-role'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffRole()

  if (!staff || staff.role !== 'admin') {
    redirect('/login')
  }

  return <>{children}</>
}
```

- [ ] **Step 4: Write `app/admin/page.tsx`**

```tsx
export default function AdminDashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Πίνακας διαχειριστή</h1>
      <p className="mt-2 text-gray-600">
        Εδώ θα διαχειρίζεσαι μενού, τραπέζια και προσωπικό (έρχεται στη Φάση 4).
      </p>
    </main>
  )
}
```

- [ ] **Step 5: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`, route list includes `/staff` and `/admin`.

- [ ] **Step 6: Commit**

```bash
git add app/staff app/admin
git commit -m "feat: add role-guarded staff and admin dashboards"
```

---

### Task 10: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:** none — this task exercises everything built in Tasks 1–9 together, against the real Supabase project from Task 4 and the accounts from Task 7.

- [ ] **Step 1: Run all automated tests**

Run: `npm test`
Expected: all Vitest suites pass (`lib/env.test.ts`, `lib/auth/protected-paths.test.ts`, `lib/auth/get-redirect-path.test.ts`).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev`
Expected: server starts on `http://localhost:3000`.

- [ ] **Step 3: Verify unauthenticated access is blocked**

Open `http://localhost:3000/admin` in an incognito/private window.
Expected: redirected to `/login`.

- [ ] **Step 4: Verify admin login**

At `/login`, sign in with `admin@demo-taverna.test` / `password123`.
Expected: redirected to `/admin`, page shows "Πίνακας διαχειριστή".

- [ ] **Step 5: Verify a waiter can't reach `/admin`**

In a separate incognito window, sign in with `waiter@demo-taverna.test` / `password123`.
Expected: redirected to `/staff`, page shows "Πίνακας σερβιτόρου". Then manually navigate to `http://localhost:3000/admin`.
Expected: redirected away (to `/login`, since this waiter session doesn't satisfy the admin layout check).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: complete Phase 1 skeleton, auth, and RLS" --allow-empty
```

---

## Self-Review Notes

- **Spec coverage:** every Phase 1 spec section has a task — tech stack (Task 1), schema+RLS (Task 4), auth flow (Tasks 5, 6, 8, 9), security requirements (env vars in Task 4, server-side checks in Tasks 5/9), local verification (Task 10).
- **No placeholders:** every step has literal file contents or an exact command with expected output.
- **Type consistency:** `StaffRole` is defined once in `lib/auth/get-redirect-path.ts` (Task 6) and imported everywhere else that needs it (`get-staff-role.ts`); `getStaffRole()`'s return shape (`{ role, restaurantId } | null`) is used identically in Task 8's redirect page and Task 9's two layouts.
