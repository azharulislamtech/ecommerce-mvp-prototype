# Secret Rotation Runbook

This runbook rotates the Supabase **service role key**, which was exposed during
early setup. It also applies to any future secret rotation (database password,
payment gateway keys). Follow it top to bottom. Do not skip the verification
steps.

## Why This Is Needed

- The service role key bypasses Row Level Security and can read/write the entire
  database. Treat a leaked service role key as full database compromise.
- The key was pasted into terminals/chat during setup, so it must be considered
  public and rotated. It was **not** committed to Git (verified: no key in
  tracked files or history, and `.env.local` / `flyway.conf` are git-ignored).

## Where The Service Role Key Lives

Rotation must update the key in every one of these places. Miss one and either
the app breaks or the old key stays usable somewhere.

| Location | Key name | Notes |
| --- | --- | --- |
| Local `.env.local` | `SUPABASE_SERVICE_ROLE_KEY` | Git-ignored. Used by `npm run dev` and server code. |
| Deployment platform env (e.g. Vercel) | `SUPABASE_SERVICE_ROLE_KEY` | Set per environment (Production/Preview). Not yet configured if you have not deployed. |
| CI secrets, if any | `SUPABASE_SERVICE_ROLE_KEY` | Only if a pipeline runs server code or the verify script. |

The key is consumed only in `src/lib/supabase/server.ts` through
`createSupabaseServiceClient()`, which is guarded by `import "server-only"` so it
can never reach the browser bundle. The database password used by Flyway
(`flyway.conf`) is a **separate** secret and is not rotated here.

## Rotation Procedure

### 1. Pre-check (old key is currently live)

```powershell
npm run verify:service-key
```

Expected: `OK: service role key is live ...`. This confirms your tooling works
before you change anything.

### 2. Generate a new key in the Supabase Dashboard

1. Open the Supabase Dashboard for project ref `qguqohukemijphzwqxgs`.
2. Go to **Project Settings -> API**.
3. Rotate the `service_role` key:
   - If the project offers the new **API keys** system (publishable / secret
     keys), create a new **secret key**, migrate `SUPABASE_SERVICE_ROLE_KEY` to
     it, and disable the legacy `service_role` JWT. New secret keys are
     individually revocable, which is the preferred long-term posture.
   - If the project still uses **legacy JWT keys**, use **Roll / regenerate** on
     the `service_role` key. Rolling invalidates the old key immediately.
4. Copy the new key value once. Do not paste it into chat, commits, or docs.

### 3. Update every stored copy

- Local: edit `.env.local` and replace the `SUPABASE_SERVICE_ROLE_KEY` value.
- Deployment: update the env var in your host (e.g. Vercel Project Settings ->
  Environment Variables) for each environment, then trigger a redeploy so the
  new value is picked up.
- CI: update the secret if a pipeline uses it.

### 4. Verify the NEW key works

Restart any running dev server first so it reloads `.env.local`, then:

```powershell
npm run verify:service-key
```

Expected: `OK: service role key is live ...`.

Then exercise a real server path that uses the service role client, for example
place a test checkout so the `create_checkout_order` RPC runs, or run:

```powershell
$env:E2E_ADMIN_EMAIL="<admin-email>"
$env:E2E_ADMIN_PASSWORD="<admin-password>"
npm run test:e2e
```

Expected: 4/4 pass. Storefront, tracking, and admin surfaces all rely on the
server clients.

### 5. Confirm the OLD key is DEAD

This is the step that proves the exposure is closed.

1. Temporarily set `SUPABASE_SERVICE_ROLE_KEY` to the **old** key value in a
   throwaway shell (do not save it to `.env.local`):

   ```powershell
   $env:NEXT_PUBLIC_SUPABASE_URL="https://qguqohukemijphzwqxgs.supabase.co"
   $env:SUPABASE_SERVICE_ROLE_KEY="<paste-old-key-here>"
   node scripts/check-service-key.mjs
   ```

2. Expected: `FAIL: service role key was rejected (HTTP 401) ...`. If it still
   says `OK`, the old key is not revoked yet. Go back to step 2 and roll again.
3. Close that shell so the old key value is gone from your environment.

### 6. Record the rotation

- Add an entry to `docs/engineering-log.md` (date, what rotated, verification
  result). Do not record any key value.
- If the rotation changed the key model (legacy JWT -> new secret keys), add a
  note to `docs/decision-log.md`.
- Flip the outstanding warnings in `README.md`, `AI_HANDOFF.md`,
  `docs/supabase-setup.md`, and `docs/production-roadmap.md` (Phase 0) from
  "rotation still required" to "rotated on <date>, old key confirmed dead".

## Best-Practice Notes

- Never print, commit, or paste any key. This runbook and the verify script are
  designed so you never have to reveal a key to check it.
- Prefer the new Supabase secret keys over legacy JWTs where available, because
  they can be revoked individually without breaking the anon/publishable key.
- Rotate on a schedule and immediately after any suspected exposure.
- Keep the service role key server-only. `src/lib/supabase/server.ts` already
  enforces this with `import "server-only"`; do not remove that guard and do not
  reference `SUPABASE_SERVICE_ROLE_KEY` from any client component or any
  `NEXT_PUBLIC_*` variable.
