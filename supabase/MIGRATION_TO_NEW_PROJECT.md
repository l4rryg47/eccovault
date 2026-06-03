# Standing up a fresh Supabase project

This repo's schema is captured as a single consolidated baseline migration:
`supabase/migrations/00000000000000_baseline.sql`. The older incremental
migrations were moved to `supabase/migrations/archive/` (the CLI ignores
subfolders) — they are kept for history only and must **not** be re-applied on
top of the baseline.

## 1. Create the project
Create a new project in the Supabase dashboard. Note its **project ref**, the
**anon key**, and the **service_role key**.

## 2. Point the CLI at it and push the schema
```bash
supabase link --project-ref <new-ref>
supabase db push          # applies 00000000000000_baseline.sql
```
Optionally load the seed (editable transfer error messages):
```bash
psql "$DATABASE_URL" -f supabase/seed.sql
# or paste supabase/seed.sql into the SQL editor
```

## 3. Update the frontend env (`.env`)
```
VITE_SUPABASE_URL=https://<new-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<new anon key>
```
(Firebase / Cloudinary vars are unrelated and unchanged.)

## 4. Regenerate types
```bash
supabase gen types typescript --project-id <new-ref> > src/lib/database.types.ts
```

## 5. Deploy Edge Functions + secrets
```bash
supabase functions deploy admin-create-user admin-delete-user admin-update-user \
  admin-reply-support create-support-request resend-inbound-support \
  send-sms-otp card-deposit-notify

supabase secrets set \
  RESEND_API_KEY=...        \
  SUPPORT_FROM_EMAIL=...     \
  SUPPORT_NOTIFY_EMAIL=...   \
  TEXTBELT_API_KEY=...
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
by the platform automatically — do not set them by hand.

## 6. Auth settings (dashboard)
- Enable **email confirmations** (MVP Level-1 verification depends on it).
- Set **Site URL** and **Redirect URLs** to your app domain.

## 7. Create the first admin
`public.is_admin()` returns true when `profiles.is_admin = true` OR the auth user
metadata flag `is_admin` is true. After the first signup:
```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'you@example.com';
```

## Notes / deviations from the original dump
- `pgcrypto` extension added (needed by `crypt()`, `gen_salt()`, `gen_random_uuid()`).
- All RLS policies that dumped as `TO unknown (OID=0)` are now `TO authenticated`.
- The legacy 5-arg `transfer_funds()` overload (no OTP) was dropped; only the
  6-arg OTP-enforcing version remains.
- RLS is enabled on `phone_otps` (the dump left it off). It has no policies and is
  reached only through `SECURITY DEFINER` functions — same pattern as `transfer_otps`.

## Pre-existing code gaps (unrelated to the move, worth fixing separately)
- `src/hooks/useSupabase.ts` calls a `request-transfer-otp` Edge Function that has
  no folder in `supabase/functions/`. Transfer OTPs are admin-generated via the
  `admin_generate_transfer_otp` RPC, so this call path is dead/legacy.
- `CLAUDE.md` references a `verify-phone` function; the actual implementation is
  `send-sms-otp`.
