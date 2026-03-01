# Leg (Legislative) Tracker

Legislative Tracker, abbreviated Leg. Tracker, is a next.js app (16+), designed to be easy to deploy to provide a high-quality legislative tracking application for competition in mock-congress enviornments.

Currently, this app is built with the following stack:

- Next.js 16+
- React 19+
- TailwindCSS 4

I built this app for the YMCA youth and government Texas competition, as they need a better app than the one they vibe coded on base 44. _sigh_

Because of this, the only currently available format is this:

- Recess (If in recess)
- Ajournment (If ajourned)
- No Active Bill (If inbetween bills)

- Opening Summation
- Question Answer Period
- Amendment Period
- Pro/Con Debate
- Closing Summation
- Voting

I am of course welcome to any PRs to change this, and add other formats such as UIL, however, this was intended for YMCA, so that is not my main focus.

This app will also have a docket feature so people can know what is going to be debated in the future, and will contain an option to specify if bill is from a different body (house or senate).

## Current implementation status

Initial implementation now includes:

- Public docket homepage (`/`) with live chamber cards and session-state display
- Public chamber view (`/chamber/[slug]`) with live current status and upcoming docket
- Hidden staff login route (`/portal/login`) with `noindex` + robots disallow
- Protected staff chamber console (`/staff/chamber/[slug]`) with live stage updates
- Chamber-scoped permissions for `evaluator`, `chair`, and `clerk`
- Admin role management page (`/staff/admin`) for assigning/removing chamber roles
- Clerk auth wiring via provider + proxy-based route protection
- PostgreSQL + Drizzle persistence for chamber state and state event history

## Environment setup

Create a `.env.local` using `.env.example` and configure:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`

Example:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
DATABASE_URL=postgres://postgres:postgres@localhost:5432/leg_tracker
```

## Non-technical quick start (recommended)

1. Install Bun (https://bun.sh) and PostgreSQL (or use a hosted PostgreSQL URL).
2. In this project folder, install dependencies:

   ```bash
   bun install
   ```

3. Run guided setup:

   ```bash
   bun run setup
   ```

   - On first run, this creates `.env.local` if missing.
   - Fill in real values for Clerk + `DATABASE_URL` when prompted.
   - Run `bun run setup` again to apply database migrations.

4. Start the app:

   ```bash
   bun run dev
   ```

5. Open in your browser:
   - Public docket: `http://localhost:3000/`
   - Staff login: `http://localhost:3000/portal/login`

### Optional: one-time user bootstrap

You can prefill these in `.env.local` before running `bun run setup`:

- `LEGTRACKER_INITIAL_ADMIN_USERS` (comma-separated Clerk user IDs)
- `LEGTRACKER_INITIAL_STAFF_USERS`
- `LEGTRACKER_INITIAL_STAFF_ROLE` (`evaluator`, `chair`, `clerk`)
- `LEGTRACKER_INITIAL_STAFF_CHAMBERS` (comma-separated chamber slugs)

## Database commands

- `bun run db:generate`
- `bun run db:migrate`
- `bun run seed:admins -- --users user_abc123,user_def456` (optional admin bootstrap)
- `bun run seed:roles -- --users user_abc123,user_eval456 --role evaluator --chambers house-main,senate-main` (optional role bootstrap)

## Local development quickstart

1. Install dependencies:

   ```bash
   bun install
   ```

2. Configure `.env.local` from `.env.example`.

3. Run DB migrations:

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

4. (Optional) Seed admin users:

   ```bash
   bun run seed:admins -- --users user_abc123,user_def456
   ```

5. (Optional) Seed staff role assignments:

   ```bash
   bun run seed:roles -- --users user_abc123,user_eval456 --role evaluator --chambers house-main,senate-main
   ```

6. Start dev server:

   ```bash
   bun run dev
   ```

7. Open app:
   - Public docket: `/`
   - Hidden login: `/portal/login`
   - Staff console: `/staff/chamber/house-main`
   - Admin role manager: `/staff/admin`

## Staff role setup

Stage updates in `/staff/chamber/[slug]` require a row in `chamber_roles` for the signed-in Clerk user ID and a valid role.

You can manage these assignments in-app from `/staff/admin` (admin users only), or directly via SQL.

You can also pre-seed assignments with:

```bash
bun run seed:roles -- --users user_abc123,user_eval456 --role evaluator --chambers house-main,senate-main
```

Valid roles:

- `evaluator`
- `chair`
- `clerk`

Example SQL:

```sql
insert into chamber_roles (id, chamber_id, user_id, role)
values (
	gen_random_uuid()::text,
	'house-main',
	'user_xxxxxxxxx',
	'chair'
);
```

## Hosted deployment guide

### Recommended approach

Use the included `full-build` script in hosted platforms so deploys run:

1. Drizzle generation
2. Database migrations
3. Next.js production build

Command:

```bash
bun run full-build
```

This keeps setup simple and avoids separate migration/build steps.

### 1) Provision dependencies

- PostgreSQL database (Neon, Supabase, Railway Postgres, Render Postgres, etc.)
- Clerk application (production keys)

### 2) Configure environment variables

Set these in your host dashboard:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`

Optional bootstrap values (one-time convenience):

- `LEGTRACKER_INITIAL_ADMIN_USERS`
- `LEGTRACKER_INITIAL_STAFF_USERS`
- `LEGTRACKER_INITIAL_STAFF_ROLE`
- `LEGTRACKER_INITIAL_STAFF_CHAMBERS`

### 3) Configure host build/start commands

Use these defaults on hosted platforms:

- Install command: `bun install`
- Build command: `bun run full-build`
- Start command: `bun run start`

If your provider supports only Node start commands, use:

- Start command: `bun x next start`

### 4) Provider examples

#### Vercel

- Framework preset: `Next.js`
- Install command: `bun install`
- Build command: `bun run full-build`
- Output: default Next.js output

#### Railway / Render / Fly.io / VPS

- Build command: `bun run full-build`
- Start command: `bun run start`
- Ensure `DATABASE_URL` and Clerk keys are set in service environment.

### 5) Optional one-time role/admin seed

After first deploy (or from your host shell):

```bash
bun run seed:admins -- --users user_abc123
bun run seed:roles -- --users user_abc123,user_eval456 --role evaluator --chambers house-main,senate-main
```

### 6) Post-deploy checks

1. Visit `/` and confirm chamber cards load.
2. Visit `/portal/login` and sign in with a staff account.
3. Confirm `/staff/chamber/house-main` loads and allows updates for users with role assignments.
4. Confirm `/staff/admin` is only accessible to configured admin users in `app_admins`.
5. Update a chamber stage and verify the public chamber page reflects the change.

## Operations notes

- Hidden login is for low visibility only; security comes from Clerk auth + server-side role checks.
- Chamber records are auto-seeded from app defaults if missing, so first boot can proceed without manual chamber inserts.
- If a staff user cannot update, verify their Clerk user ID and `chamber_roles` assignment.
- Stage options are DB-backed (`stage_options`) and can be managed through data updates/migrations.
- Admin access is DB-backed (`app_admins`); if no admin rows exist yet, first authenticated user can access admin setup.
- Role seed script is idempotent for chamber/user combinations and can be re-run safely.
- `full-build` intentionally runs migrations at build time for simpler hosted setup. Use with caution in very high-scale multi-region deploys where a dedicated migration job is preferred.
