# Phase 2: Customer Menu View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public `/menu/[slug]` page that shows a restaurant's menu, grouped by category, with a client-side dietary-tag filter, with no login required and no data leakage across restaurants.

**Architecture:** Server component fetches restaurant + categories + items via the Supabase server client (anon role, now allowed to read menu data via new RLS policies); a client component owns the filter UI state over the already-fetched data (no extra round trips).

**Tech Stack:** Same as Phase 1 (Next.js App Router, TypeScript, Tailwind, Supabase, Vitest).

## Global Constraints

- No anon RLS policy on `tables` — table identification stays cosmetic (URL display only) until Phase 3 needs real validation (see design doc rationale).
- Unavailable menu items (`available = false`) never appear in the customer view.
- Unknown restaurant slug → Next.js `notFound()`.
- Full design context: `docs/superpowers/specs/2026-07-24-phase2-customer-menu-design.md`.

---

## File Structure

```
faghto/
  supabase/migrations/0002_public_menu_read.sql   (new)
  scripts/seed-menu.ts                             (new)
  lib/menu/filter-items.ts                          (new)
  lib/menu/filter-items.test.ts                     (new)
  lib/menu/get-restaurant-menu.ts                    (new)
  components/menu/MenuBrowser.tsx                    (new)
  app/menu/[slug]/page.tsx                            (new)
```

---

### Task 1: Public read RLS policies

**Files:**
- Create: `supabase/migrations/0002_public_menu_read.sql`

**Interfaces:**
- Produces: anon-readable `restaurants`, `menu_categories`, and `menu_items` (available only) rows in the live Supabase project. Every later task depends on this.

- [ ] **Step 1: Write `supabase/migrations/0002_public_menu_read.sql`**

```sql
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
```

- [ ] **Step 2: Apply it (manual, Supabase dashboard)**

Open the same Supabase project's **SQL Editor**, paste the file contents, click **Run**.
Expected: "Success. No rows returned."

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_public_menu_read.sql
git commit -m "feat: add public read RLS policies for the customer menu"
```

---

### Task 2: Demo menu seed data

**Files:**
- Create: `scripts/seed-menu.ts`

**Interfaces:**
- Consumes: the `demo-taverna` restaurant already created by `scripts/seed.ts` (Phase 1).
- Produces: 2 categories and 6 items in the live Supabase project, so the menu page has something to show.

- [ ] **Step 1: Write `scripts/seed-menu.ts`**

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

async function seedMenu() {
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'demo-taverna')
    .single()

  if (restaurantError || !restaurant) {
    throw new Error('demo-taverna restaurant not found — run `npm run seed` first')
  }

  const categories = [
    { name: 'Ορεκτικά', sort_order: 0 },
    { name: 'Κυρίως Πιάτα', sort_order: 1 },
  ]

  const { data: insertedCategories, error: categoriesError } = await supabase
    .from('menu_categories')
    .insert(categories.map((category) => ({ ...category, restaurant_id: restaurant.id })))
    .select()

  if (categoriesError || !insertedCategories) throw categoriesError

  const [appetizers, mains] = insertedCategories.sort((a, b) => a.sort_order - b.sort_order)

  const items = [
    { category_id: appetizers.id, name: 'Τζατζίκι', description: 'Γιαούρτι, αγγούρι, σκόρδο', price: 4.5, tags: ['vegetarian'] },
    { category_id: appetizers.id, name: 'Ντολμαδάκια', description: 'Αμπελόφυλλα με ρύζι', price: 5.5, tags: ['vegetarian', 'vegan'] },
    { category_id: appetizers.id, name: 'Κεφτεδάκια', description: 'Σπιτικά κεφτεδάκια', price: 6.0, tags: [] },
    { category_id: mains.id, name: 'Μουσακάς', description: 'Παραδοσιακός μουσακάς', price: 11.5, tags: [] },
    { category_id: mains.id, name: 'Γεμιστά', description: 'Ντομάτες και πιπεριές γεμιστές με ρύζι', price: 9.5, tags: ['vegetarian', 'vegan'] },
    { category_id: mains.id, name: 'Σουβλάκι Χοιρινό', description: 'Με πίτα και πατάτες', price: 8.5, tags: ['spicy'] },
  ]

  const { error: itemsError } = await supabase.from('menu_items').insert(items)
  if (itemsError) throw itemsError

  console.log(`Seeded ${insertedCategories.length} categories and ${items.length} items.`)
}

seedMenu()
  .then(() => {
    console.log('Menu seed complete.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Menu seed failed:', err)
    process.exit(1)
  })
```

- [ ] **Step 2: Add the npm script**

Edit `package.json`, add to `"scripts"`:

```json
"seed:menu": "tsx scripts/seed-menu.ts"
```

- [ ] **Step 3: Run it**

Run: `npm run seed:menu`
Expected: `Seeded 2 categories and 6 items.` then `Menu seed complete.`

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-menu.ts package.json
git commit -m "feat: add demo menu seed script"
```

---

### Task 3: Tag filter (pure function, TDD)

**Files:**
- Create: `lib/menu/filter-items.ts`
- Test: `lib/menu/filter-items.test.ts`

**Interfaces:**
- Produces: `type MenuItem = { id: string; name: string; description: string | null; price: number; tags: string[]; available: boolean }` and `filterItemsByTags(items: MenuItem[], selectedTags: string[]): MenuItem[]`. Used by Task 4 (return type) and Task 5 (client-side filtering).

- [ ] **Step 1: Write the failing test**

```ts
// lib/menu/filter-items.test.ts
import { describe, expect, it } from 'vitest'
import { filterItemsByTags, type MenuItem } from './filter-items'

const items: MenuItem[] = [
  { id: '1', name: 'Τζατζίκι', description: null, price: 4.5, tags: ['vegetarian'], available: true },
  { id: '2', name: 'Γεμιστά', description: null, price: 9.5, tags: ['vegetarian', 'vegan'], available: true },
  { id: '3', name: 'Σουβλάκι', description: null, price: 8.5, tags: ['spicy'], available: true },
]

describe('filterItemsByTags', () => {
  it('returns all items when no tags are selected', () => {
    expect(filterItemsByTags(items, [])).toEqual(items)
  })

  it('returns only items matching a single selected tag', () => {
    expect(filterItemsByTags(items, ['spicy'])).toEqual([items[2]])
  })

  it('returns only items matching all selected tags', () => {
    expect(filterItemsByTags(items, ['vegetarian', 'vegan'])).toEqual([items[1]])
  })

  it('returns an empty array when no item matches', () => {
    expect(filterItemsByTags(items, ['gluten-free'])).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/menu/filter-items.test.ts`
Expected: FAIL — `Cannot find module './filter-items'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/menu/filter-items.ts
export type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  tags: string[]
  available: boolean
}

export function filterItemsByTags(items: MenuItem[], selectedTags: string[]): MenuItem[] {
  if (selectedTags.length === 0) return items
  return items.filter((item) => selectedTags.every((tag) => item.tags.includes(tag)))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/menu/filter-items.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/menu/filter-items.ts lib/menu/filter-items.test.ts
git commit -m "feat: add pure tag-filtering function for the menu view"
```

---

### Task 4: Menu data fetcher

**Files:**
- Create: `lib/menu/get-restaurant-menu.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 3, Phase 1), `type MenuItem` from `lib/menu/filter-items.ts` (Task 3).
- Produces: `type MenuCategory = { id: string; name: string; sortOrder: number; items: MenuItem[] }`, `type RestaurantMenu = { restaurant: { id: string; name: string; slug: string }; categories: MenuCategory[] }`, and `getRestaurantMenu(slug: string): Promise<RestaurantMenu | null>`. Used by Task 5's page.

- [ ] **Step 1: Write `lib/menu/get-restaurant-menu.ts`**

```ts
import { createClient } from '@/lib/supabase/server'
import type { MenuItem } from '@/lib/menu/filter-items'

export type MenuCategory = {
  id: string
  name: string
  sortOrder: number
  items: MenuItem[]
}

export type RestaurantMenu = {
  restaurant: { id: string; name: string; slug: string }
  categories: MenuCategory[]
}

export async function getRestaurantMenu(slug: string): Promise<RestaurantMenu | null> {
  const supabase = await createClient()

  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (restaurantError || !restaurant) return null

  const { data: categories, error: categoriesError } = await supabase
    .from('menu_categories')
    .select('id, name, sort_order')
    .eq('restaurant_id', restaurant.id)
    .order('sort_order')

  if (categoriesError || !categories || categories.length === 0) {
    return { restaurant, categories: [] }
  }

  const categoryIds = categories.map((category) => category.id)

  const { data: items, error: itemsError } = await supabase
    .from('menu_items')
    .select('id, category_id, name, description, price, tags, available')
    .in('category_id', categoryIds)
    .eq('available', true)

  if (itemsError || !items) {
    return {
      restaurant,
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
        items: [],
      })),
    }
  }

  return {
    restaurant,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sort_order,
      items: items
        .filter((item) => item.category_id === category.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price),
          tags: item.tags ?? [],
          available: item.available,
        })),
    })),
  }
}
```

Not unit tested — thin Supabase query wrapper with no branching logic of its own beyond
null-handling, same reasoning as `get-staff-role.ts` in Phase 1. Covered by Task 6's
manual check.

- [ ] **Step 2: Verify the project still builds**

Run: `npm run build`
Expected: `✓ Compiled successfully` (not imported by any page yet).

- [ ] **Step 3: Commit**

```bash
git add lib/menu/get-restaurant-menu.ts
git commit -m "feat: add restaurant menu data fetcher"
```

---

### Task 5: Menu page + browser component

**Files:**
- Create: `components/menu/MenuBrowser.tsx`
- Create: `app/menu/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getRestaurantMenu()` (Task 4), `filterItemsByTags()` and `type MenuItem` (Task 3).
- Produces: the public `/menu/[slug]?table=...` route.

- [ ] **Step 1: Write `components/menu/MenuBrowser.tsx`**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { filterItemsByTags, type MenuItem } from '@/lib/menu/filter-items'

type MenuCategory = {
  id: string
  name: string
  items: MenuItem[]
}

export function MenuBrowser({
  restaurantName,
  tableLabel,
  categories,
}: {
  restaurantName: string
  tableLabel: string | null
  categories: MenuCategory[]
}) {
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    categories.forEach((category) =>
      category.items.forEach((item) => item.tags.forEach((tag) => tagSet.add(tag)))
    )
    return Array.from(tagSet).sort()
  }, [categories])

  const [selectedTags, setSelectedTags] = useState<string[]>([])

  function toggleTag(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag]
    )
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{restaurantName}</h1>
        {tableLabel && <p className="mt-1 text-sm text-gray-500">Τραπέζι {tableLabel}</p>}
      </header>

      {allTags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full border px-3 py-1 text-sm ${
                selectedTags.includes(tag)
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {categories.map((category) => {
        const items = filterItemsByTags(category.items, selectedTags)
        if (items.length === 0) return null

        return (
          <section key={category.id} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-900">{category.name}</h2>
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-600">{item.description}</p>
                    )}
                    {item.tags.length > 0 && (
                      <p className="mt-1 text-xs text-gray-400">{item.tags.join(', ')}</p>
                    )}
                  </div>
                  <p className="whitespace-nowrap font-medium text-gray-900">
                    {item.price.toFixed(2)}&nbsp;€
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
```

- [ ] **Step 2: Write `app/menu/[slug]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { getRestaurantMenu } from '@/lib/menu/get-restaurant-menu'
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

  return (
    <MenuBrowser
      restaurantName={menu.restaurant.name}
      tableLabel={searchParams.table ?? null}
      categories={menu.categories}
    />
  )
}
```

- [ ] **Step 3: Run all unit tests**

Run: `npm test`
Expected: all suites pass, including the new `filter-items.test.ts`.

- [ ] **Step 4: Verify the project builds**

Run: `npm run build`
Expected: `✓ Compiled successfully`, route list includes `/menu/[slug]` as dynamic (`ƒ`).

- [ ] **Step 5: Commit**

```bash
git add components/menu app/menu
git commit -m "feat: add public customer menu page"
```

---

### Task 6: Manual verification

**Files:** none.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`

- [ ] **Step 2: Visit the seeded restaurant**

Open `http://localhost:3000/menu/demo-taverna?table=12`.
Expected: "Demo Taverna" heading, "Τραπέζι 12" under it, 2 categories with 3 items each,
tag filter chips (vegan, vegetarian, spicy) at the top.

- [ ] **Step 3: Try a filter**

Click the "vegan" chip.
Expected: only "Ντολμαδάκια" and "Γεμιστά" remain visible; the "Κυρίως Πιάτα"/"Ορεκτικά"
category headers only show if they still have matching items.

- [ ] **Step 4: Try an unknown restaurant**

Open `http://localhost:3000/menu/does-not-exist`.
Expected: Next.js 404 page.

---

## Self-Review Notes

- **Spec coverage:** dietary filters (Task 3/5), availability hiding (Task 4's `.eq('available', true)`), cosmetic-only table param (Task 5's page — no DB lookup on `table`), unknown-slug 404 (Task 5's page), RLS additions (Task 1).
- **No placeholders:** every step has literal file contents or an exact command with expected output.
- **Type consistency:** `MenuItem` defined once in `lib/menu/filter-items.ts`, reused by `get-restaurant-menu.ts` and `MenuBrowser.tsx` without redefinition.
