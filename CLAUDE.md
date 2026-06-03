# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Run Vitest (single pass)
npm run test:watch   # Vitest in watch mode
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.ts
```

Edge functions run on Deno and are deployed via Supabase CLI — they are not part of the Vite build.

## Architecture Overview

This is a React + TypeScript SPA (Vite) backed entirely by Supabase (Postgres, Auth, Storage, Realtime, Edge Functions). There is no separate API server — all business logic lives either in Supabase RPC functions, Edge Functions, or the client.

### Two completely separate dashboards

`src/App.tsx` wires up two nested route trees under different layouts:

- `/dashboard/*` — `DashboardLayout` → user-facing pages (`src/pages/dashboard/`)
- `/admin/*` — `AdminLayout` → admin-only pages (`src/pages/admin/`)

`DashboardLayout` automatically redirects admins to `/admin`. `AdminLayout` shows a 403 if a non-admin accesses it. Both layouts read `useIsAdmin()` which calls the `public.is_admin()` Postgres RPC.

### Data fetching: `useSupabase.ts` and `useAdmin.ts`

All user-facing Supabase queries and mutations live in `src/hooks/useSupabase.ts`. All admin queries and mutations live in `src/hooks/useAdmin.ts`. Both use TanStack React Query (v5).

Query keys are exported from `useSupabase.ts` as `keys.*` — always use these when calling `queryClient.invalidateQueries` to keep invalidations consistent.

Realtime subscriptions (e.g. `useRealtimeAccounts`) listen via `supabase.channel(...)` and call `queryClient.invalidateQueries` on Postgres changes — they do not maintain their own state.

### Admin operations use Edge Functions

Mutations that require service-role access (create/delete users, reply to support tickets) call Supabase Edge Functions in `supabase/functions/`. Each function:
1. Accepts a Bearer token from the caller
2. Creates a `supabaseAdmin` client with the service role key (never exposed to the browser)
3. Calls `supabaseAdmin.auth.getUser(token)` then checks `is_admin` on the profile before doing anything

Never call `supabaseAdmin` from the client — only from Edge Functions.

### Authentication and re-verification

`AuthContext` (`src/contexts/AuthContext.tsx`) holds `user`, `profile`, `session`, and a `lastVerified` timestamp. Sensitive UI actions check `isLocked` and show `ReauthModal` when the grace period (60 s after login) has expired. `reauth()` re-validates the password without creating a new session.

`useSessionTimeout` auto-logs out after 10 minutes of inactivity.

### Transfer flow and OTP

`transfer_funds()` is a Postgres RPC (not a JS function). It validates account state, checks `requires_transfer_otp`, looks up customizable error messages from `admin_settings`, and returns `{ ok, error }`. The client in `TransferPage` calls this RPC directly via `supabase.rpc('transfer_funds', {...})`.

When an account has `requires_transfer_otp = true`, the frontend first calls `supabase.rpc('generate_transfer_otp')`, shows the OTP input, then passes the code along with the transfer payload.

### Database schema conventions

- `database.types.ts` is auto-generated from the Supabase schema — do not hand-edit it.
- Admin-only SQL functions are prefixed `admin_*` and use `SECURITY DEFINER` with an internal `is_admin()` check.
- Account state uses two fields: `status` (legacy, `active|inactive|frozen`) and `account_state` (newer, `active|inactive|on_hold|suspended`). Prefer `account_state` for new code.

### Migrations

New migrations go in `supabase/migrations/` with a `YYYYMMDDHHMMSS_description.sql` filename (full timestamp, not just the date). Supabase derives the migration *version* from the leading number, so two files sharing the same `YYYYMMDD` prefix collide with a `schema_migrations_pkey` duplicate-key error on `db push` — always use the full `YYYYMMDDHHMMSS` form to guarantee unique, ordered versions. They are applied manually via Supabase CLI (`supabase db push`) or the Supabase dashboard.

### UI conventions

- All UI primitives come from Shadcn/ui (`src/components/ui/`) — extend these rather than creating parallel components.
- Toast notifications use Sonner (`import { toast } from "sonner"`).
- Forms use React Hook Form + Zod. Define schemas with `z.object(...)` co-loaded with the form component.
- Animations use Framer Motion. Keep motion usage lightweight — primarily `AnimatePresence` + `motion.div` with opacity/y transitions.

---

## MVP Features (in progress)

### 1. Admin approval workflow
- Admin manually approves a user before they can access the dashboard.
- Approval action lives in a **user detail modal/drawer** on the `AdminUsers` page.
- Clicking a user row opens the drawer showing their full profile info and an Approve / Suspend / Freeze / On Hold action.
- Approval flips `profiles.approval_status` to `approved`.

### 2. "Account not active" UX
- `pending` status → full-screen `PendingApprovalPage` (existing behavior, no sidebar).
- `suspended | on_hold | frozen` → user sees the **dashboard shell with the sidebar**, but the content area shows only a status-appropriate message ("Account not active yet", reason, contact support).
- This is enforced in `DashboardLayout` by checking `approval_status`.

### 3. Two-level verification at first login
- **Level 1 — Email**: Supabase native email confirmation. Users must confirm their email before they can log in.
- **Level 2 — SMS OTP**: After login, if `profiles.phone_verified = false`, `DashboardLayout` intercepts and shows a phone-verification step (`PhoneVerificationStep`). The `send-sms-otp` Edge Function sends an SMS OTP via Textbelt (`TEXTBELT_API_KEY`) and stores it through the `store_phone_otp` RPC. On correct entry, the client calls the `verify_phone_otp` RPC, which validates the code and sets `phone_verified = true` on the profile. Set `VITE_SKIP_PHONE_VERIFICATION=true` to bypass this step in development.
- Both verifications must pass before `DashboardLayout` renders the dashboard (or redirects to `PendingApprovalPage` if also pending approval).

### 4. Admin balance top-up
- Already implemented via `useAdminAdjustBalance` in `AdminAccounts`.
- Admin selects an account row, enters credit/debit amount and optional note, applies it.
- No additional work needed unless surfacing gaps are found.

### 5. Admin-configurable transfer error messages
- `admin_settings` key-value table is already read by the `transfer_funds()` RPC.
- Admin edits messages via the free-form `AdminSettings` page (no dedicated UI section needed).
- Preset key naming convention: `error_<account_state>` (e.g. `error_frozen`, `error_on_hold`, `error_suspended`).

### 6. Transfer OTP — admin-provided
- **Every transfer** requires an OTP that is generated by the admin and given to the user out-of-band (verbally or via another channel).
- Admin has a "Generate OTP" button per account in the admin panel (likely in the user detail drawer or `AdminAccounts`).
- OTP is stored in the DB (e.g. `accounts.transfer_otp` + `accounts.transfer_otp_used`) and is **single-use with no time expiry**.
- On the `TransferPage`, the OTP input is always shown (not conditional on `requires_transfer_otp`) — the user must enter the admin-provided code before the transfer is submitted.
- `transfer_funds()` RPC validates the OTP, marks it used, then proceeds.
