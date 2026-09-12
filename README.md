# Buildcon House

An internal operations platform for a home-interiors and building-materials business, organised
into four independent business areas ("floors"):

- **Ground Floor — Tiles**
- **Second Floor — Sanitary Bathroom**
- **Kitchen Floor**
- **Furniture Floor**

Each floor has its own walk-ins, customers, catalogue, quotations, orders/purchases, payments and
follow-ups. Staff switch floors from the sidebar; the choice persists across sessions.

## Status

This is under active development. Built so far:

- Full multi-floor database schema with row-level security (`supabase/migrations/0001_init.sql`)
- Auth (email/password), role-based access (`owner`, `floor_manager`, `sales_executive`,
  `accountant`, `viewer`), and per-user floor access grants
- Floor switching, persisted in a cookie, enforced server-side on every query
- App shell: collapsible sidebar, floor switcher, quick-navigation search (⌘K), profile menu
- "Today" dashboard (Ground Floor / Sanitary Bathroom) with live follow-up, pipeline and revenue
  data
- Walk-ins: full CRUD, duplicate detection, activity timeline, quick actions (call, WhatsApp,
  convert to customer, mark won/lost), CSV export
- Customers: full CRUD, linked walk-ins/quotations/orders/payments, outstanding balance
- Follow-ups workspace: Today / Overdue / Upcoming / Completed / All, complete / reschedule /
  reassign
- Team management (owner-only): invite staff, assign roles and floor access
- Business settings: profile, logo, bank/UPI details, quotation defaults

Not yet built (tracked for the next pass): catalogue, the full quotation builder + PDF for Tiles
and Sanitary Bathroom, Quotation Follow-up for Kitchen/Furniture, tile orders, purchases, the
payments/payment-list screens, notifications, and the Sales Data analytics module. Routes for
these exist in the sidebar per floor but their pages are not implemented yet.

## Tech stack

- Next.js 16 (App Router, TypeScript)
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres, Auth, Storage, RLS)
- React Hook Form + Zod
- TanStack Table v9
- Recharts
- `@react-pdf/renderer` for quotation PDFs

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com).

3. **Run the migration.** Open the SQL Editor in your Supabase project and run the full contents
   of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). This creates every
   table, enum, function, RLS policy, and the storage buckets used for the logo, catalogue images
   and attachments.

4. **Configure environment variables.** Copy `.env.local.example` to `.env.local` and fill in the
   values from Project Settings → API:

   ```bash
   cp .env.local.example .env.local
   ```

   | Variable | Where to find it | Notes |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | Public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon public key | Public |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key | **Secret** — server-only, used to invite staff. Never expose to the browser. |

5. **Create your owner account.** In Supabase → Authentication → Users, add a user with a
   password. Open the new user and set this in **User Metadata**:

   ```json
   { "role": "owner" }
   ```

   The owner role has access to every floor automatically — no `user_floor_access` row needed.

6. **Run the app**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` and sign in.

7. **Upload a logo** (optional) from Settings once signed in as the owner — it appears in the
   sidebar and, once the PDF builder ships, on quotation PDFs.

## Adding staff

As the owner, go to **Team** and invite staff by email. Choose their role and which floor(s) they
can access:

- **Owner** — every floor, every module, can manage settings and team
- **Floor Manager** — full access, but only to their assigned floor(s)
- **Sales Executive** — create/manage walk-ins, customers, quotations and follow-ups on assigned
  floors
- **Accountant** — payments and financial records on assigned floors
- **Viewer** — read-only on assigned floors

Access is enforced both in the UI and in the database via row-level security — a user with no
grant for a floor cannot read or write its data even via the API.

## Project structure

```
src/
  app/(app)/          Authenticated routes (floor-scoped pages, layout, sidebar)
  app/login, /setup…  Public auth routes
  app/api/…           Route handlers (PDF generation, etc.)
  components/          UI components, grouped by feature (walk-ins, customers, …) plus
                        components/ui (shadcn primitives) and components/shared (generic pieces)
  lib/actions/         Server actions ("use server"), one file per domain
  lib/validations/     Zod schemas shared by forms and server actions
  lib/queries/         Read-heavy data-fetching helpers for server components
  lib/supabase/        Browser/server/admin Supabase clients + hand-written DB types
  lib/floors.ts        Floor configuration (labels, per-floor module visibility)
supabase/migrations/    SQL migrations (run manually in the Supabase SQL editor for now)
```

## Deployment

Deploy to any Next.js host (Vercel is the simplest). Set the three environment variables above in
the host's dashboard — never commit `.env.local`. Point the Supabase project's auth redirect URLs
(Authentication → URL Configuration) at your deployed domain so password-reset links work.

## Regenerating database types

`src/lib/supabase/types.ts` is hand-written to match the migration. If you change the schema,
either update it by hand or, once the Supabase CLI is linked to your project, regenerate it with:

```bash
supabase gen types typescript --linked > src/lib/supabase/types.ts
```

and reconcile any naming differences with the rest of the codebase.
