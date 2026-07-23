# Phase 1 Design: Skeleton + Supabase + Auth

## Context

Το πλήρες project είναι μια multi-tenant SaaS πλατφόρμα QR menu/table-service για εστιατόρια
(customer menu view, real-time κάλεσμα σερβιτόρου/λογαριασμού, staff dashboard, admin panel).
Το project χωρίστηκε σε φάσεις. Αυτό το spec καλύπτει **μόνο τη Φάση 1**: το σκελετό της
εφαρμογής, τη σύνδεση με Supabase, και το auth (login) για σερβιτόρους/admins.

Επόμενες φάσεις (ξεχωριστά specs όταν φτάσουμε εκεί):
2. Customer menu view (χωρίς real-time)
3. Real-time call-waiter flow
4. Admin panel (CRUD menu/τραπέζια/προσωπικό, analytics)
5. Deployment (Vercel + Supabase, βήμα-βήμα)

## Scope decisions

- **Multi-tenant από την αρχή**: το schema και τα RLS policies υποστηρίζουν πολλά εστιατόρια
  εξαρχής (κάθε εστιατόριο έχει δικό του `slug`). Δεν χτίζουμε single-tenant MVP που θα χρειαστεί
  αργότερα migration.
- **Auth μέθοδος**: email + κωδικός (Supabase Auth), όχι magic link — πιο βολικό για σερβιτόρους
  που κάνουν login σε γρήγορο shift χωρίς πρόσβαση σε email σε κάθε βάρδια.
- **Onboarding λογαριασμών**: χειροκίνητο seed (script) προς το παρόν. Δεν υπάρχει public
  self-signup flow ακόμα — θα προστεθεί αργότερα αν χρειαστεί ως ξεχωριστή φάση.
- **Γλώσσα**: TypeScript (όχι plain JavaScript) — το Supabase δίνει auto-generated types για το DB
  schema, πιάνει λάθη (π.χ. λάθος όνομα πεδίου) πριν τρέξει ο κώδικας.
- **Development environment**: πραγματικό (δωρεάν tier) Supabase cloud project από την αρχή, όχι
  τοπικό Docker/Supabase CLI stack — αποφεύγει περιττή πολυπλοκότητα για αρχάριο, και είναι το
  ίδιο environment που θα χρησιμοποιηθεί στο deployment.

## Tech stack

- **Next.js 14+ (App Router)** + **TypeScript**
- **Tailwind CSS** για styling
- **@supabase/ssr** — το επίσημο πακέτο Supabase για Next.js App Router (σωστό session handling
  και σε server components και σε client components)
- **Next.js middleware** (`middleware.ts`) για server-side session check σε `/staff/*` και
  `/admin/*` — redirect σε login πριν καν φορτώσει η σελίδα, όχι client-side-only έλεγχος

Εναλλακτική που απορρίφθηκε: Firebase αντί Supabase — πιο αδύναμο σε relational queries/RLS για
αυτό το σχεσιακό data model (restaurants → tables → menu items).

## Database schema

Όλο το schema γράφεται εξαρχής (φθηνό σε SQL migration), αλλά στη Φάση 1 "ενεργοποιούνται" μόνο τα
`restaurants` + `staff` (τα υπόλοιπα μένουν άδεια, έτοιμα για επόμενες φάσεις):

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
```

Σχεδιαστικές αποφάσεις πάνω στον αρχικό σκελετό:
- **`qr_token uuid`** ξεχωριστό από το `id` του τραπεζιού: το QR code δείχνει στο `qr_token`, όχι
  στο πρωτεύον κλειδί — κανείς δεν μπορεί να "μαντέψει" άλλα τραπέζια αλλάζοντας αριθμό στο URL.
- **`CHECK` constraints** αντί για Postgres `enum` types για `role`/`type`/`status` — πιο εύκολο να
  προστεθεί νέα τιμή αργότερα χωρίς `ALTER TYPE`.
- **`resolved_at`** προστέθηκε στο `requests` — χρειάζεται για το admin analytics "μέσος χρόνος
  απόκρισης" που ζητήθηκε.

## Auth flow

1. Σελίδα `/login` (email + κωδικός, όχι public sign up).
2. Μετά το login, διαβάζεται ο ρόλος από το `staff` table: `admin` → redirect `/admin`,
   `waiter` → redirect `/staff`.
3. **`middleware.ts`** τρέχει σε κάθε request σε `/staff/*` και `/admin/*`: ελέγχει αν υπάρχει
   valid Supabase session server-side. Χωρίς session → redirect `/login`.
4. **Role-based access** (π.χ. waiter να μην ανοίγει `/admin`) γίνεται σε server component
   `layout.tsx` μέσα σε κάθε section — query στο `staff` table, redirect αν ο ρόλος δεν ταιριάζει.
   Ξεχωριστό βήμα από το middleware για σαφήνεια: "είσαι logged in" vs "επιτρέπεται σε *εσένα*
   να δεις αυτή τη σελίδα".

## RLS policies (Phase 1 scope)

Μόνο ό,τι χρειάζεται τώρα· θα προστίθενται περισσότερα per phase (least privilege, όχι
προκαταβολικά ανοιχτά policies "για κάθε ενδεχόμενο"):

```sql
alter table staff enable row level security;
alter table restaurants enable row level security;

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

Δεν υπάρχει ακόμα κανένα anon (μη συνδεδεμένος χρήστης) policy — αυτό έρχεται στη Φάση 2 με το
customer menu view. Το seeding των πρώτων λογαριασμών γίνεται με το Supabase **Service Role key**
(τρέχει μόνο τοπικά μέσω script, ποτέ στον browser) που παρακάμπτει το RLS — σωστό γιατί είναι
διαχειριστική ενέργεια του platform operator, όχι κάτι που κάνει η ίδια η εφαρμογή.

## Repo structure

```
faghto/
  app/
    layout.tsx              root layout
    page.tsx                απλή landing page
    login/page.tsx          φόρμα email+κωδικός
    staff/
      layout.tsx             ελέγχει ρόλο (waiter ή admin), αλλιώς redirect
      page.tsx                placeholder dashboard (γεμίζει στη Φάση 3)
    admin/
      layout.tsx             ελέγχει ρόλο (μόνο admin), αλλιώς redirect
      page.tsx                placeholder dashboard (γεμίζει στη Φάση 5)
  lib/supabase/
    client.ts               Supabase client για browser
    server.ts                Supabase client για server components
  middleware.ts             session check σε /staff/* και /admin/*
  supabase/migrations/
    0001_init.sql            όλο το schema + RLS policies
  scripts/seed.ts            demo εστιατόριο + admin + waiter χρήστης
  .env.local                 πραγματικά κλειδιά (gitignored)
  .env.local.example         template χωρίς πραγματικές τιμές (μπαίνει στο git)
  .gitignore
```

## Security requirements carried into Phase 1

- Κανένα secret/API key hardcoded — μόνο μέσω `.env.local`, gitignored, με `.env.local.example`
  ως template στο repo.
- `/staff/*` και `/admin/*` ελέγχονται server-side (middleware + layout), όχι μόνο client-side
  redirect.
- RLS ενεργό σε κάθε table από την πρώτη migration, όχι προστιθέμενο αργότερα.

## Local verification (μετά την υλοποίηση της Φάσης 1)

1. `npm run dev`, άνοιγμα `http://localhost:3000/login`.
2. Login με seeded admin λογαριασμό → πρέπει να γίνει redirect σε `/admin`.
3. Άνοιγμα `/admin` απευθείας σε incognito (χωρίς login) → πρέπει redirect σε `/login`.
4. Login με seeded waiter λογαριασμό, χειροκίνητο άνοιγμα `/admin` → πρέπει redirect μακριά
   (δεν έχει δικαίωμα πρόσβασης).

## Out of scope for Phase 1

- Customer-facing menu view και οτιδήποτε σχετικό με anon/table access (Φάση 2).
- Real-time requests flow (Φάση 3).
- Admin CRUD λειτουργικότητα πέρα από το login redirect (Φάση 4).
- Rate limiting στο "κάλεσε σερβιτόρο" endpoint (δεν υπάρχει ακόμα το endpoint — έρχεται Φάση 3).
- Deployment σε Vercel/Supabase production (τελευταία φάση).
- Public self-signup για νέα εστιατόρια.
