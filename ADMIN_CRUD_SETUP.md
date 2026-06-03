# Admin User CRUD Setup Guide - Edge Functions

This guide covers deploying Supabase Edge Functions for secure admin user CRUD operations.

## Architecture

- **Frontend**: `src/pages/admin/AdminUsers.tsx` → User CRUD UI with modal
- **Hooks**: `src/hooks/useAdmin.ts` → Calls Edge Functions with bearer token
- **Edge Functions**: `supabase/functions/{admin-create-user,admin-update-user,admin-delete-user}/` → Handle auth checks and user management
- **Security**: Service role key used only on the server; anon key never calls auth APIs directly

---

## Deployment Instructions

### Step 0: Install Supabase CLI

If you don't have the Supabase CLI installed, run:

**macOS / Linux:**

```bash
brew install supabase/tap/supabase
```

**Windows (using Scoop):**

```bash
scoop install supabase
```

**Windows (using npm):**

```bash
npm install -g supabase
```

**Verify installation:**

```bash
supabase --version
```

### Step 1: Verify Edge Functions Exist

The Edge Functions should already exist in your project:

- `supabase/functions/admin-create-user/index.ts` — Create a new user
- `supabase/functions/admin-update-user/index.ts` — Update user profile
- `supabase/functions/admin-delete-user/index.ts` — Delete a user

### Step 1b: Run SQL Migration

The `admin_get_users` RPC function is needed for the users list to work properly.

1. Open **Supabase Dashboard → SQL Editor**
2. Run the code from `supabase/migrations/admin_user_crud.sql`
   - This creates `admin_get_users()` RPC and the CRUD functions
   - The RPC bypasses row-level security and returns all users

### Step 2: Deploy Edge Functions

From your project root, run:

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-update-user
supabase functions deploy admin-delete-user
```

Or deploy all at once:

```bash
supabase functions deploy
```

### Step 3: Configure Admin Role

Each Edge Function checks if the calling user has `is_admin` set in their profile. Mark yourself as admin:

**SQL command** (Supabase Dashboard → SQL Editor):

```sql
UPDATE profiles
SET is_admin = TRUE
WHERE email = 'your-email@example.com';
```

---

## Frontend Integration

The frontend is already configured to call these Edge Functions via the hooks in `src/hooks/useAdmin.ts`:

- `useAdminCreateUser()` — POST `/functions/v1/admin-create-user`
- `useAdminUpdateUser()` — POST `/functions/v1/admin-update-user`
- `useAdminDeleteUser()` — POST `/functions/v1/admin-delete-user`

Each hook:

1. Gets the current user's session token
2. Sends it as a Bearer token in the Authorization header
3. The Edge Function validates the token and checks admin status
4. On success, returns the result and invalidates user queries

---

## Testing

1. **Make yourself an admin** (Step 3 above)
2. Go to **Admin Panel → Users**
3. Click **"New user"** button
4. Enter test user details and submit
5. Check **Supabase Dashboard → Authentication** to verify user was created

---

## Troubleshooting

### 404 on Edge Function Calls

- Did you run `supabase functions deploy`?
- Check **Supabase Dashboard → Edge Functions** for deployment status

### 403 "Admin access required"

- Your profile's `is_admin` field is not set to `true`
- Run the SQL command in Step 3 above

### 400 "Email already exists"

- Try a different email address

### Connection Errors

- Verify `VITE_SUPABASE_URL` in `.env`
- Confirm Supabase project is reachable

---

## Security Notes

- Edge Functions use the **Service Role Key** (managed by Supabase)
- The **anon key** is never exposed to auth APIs
- Each request validates the user's admin status
- All actions are logged in Supabase audit logs
