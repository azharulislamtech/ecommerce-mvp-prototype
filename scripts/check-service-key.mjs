// Verifies that the currently configured Supabase service role key is live and
// actually has service_role privileges. Used before and after key rotation.
//
// Usage (loads .env.local without extra dependencies on Node 18+):
//   node --env-file=.env.local scripts/check-service-key.mjs
//
// It never prints the key. It only reports whether the key is accepted.
// Exit code 0 = key is a live service_role key. Exit code 1 = it is not.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

if (!url) {
  fail("NEXT_PUBLIC_SUPABASE_URL is not set. Load it via: node --env-file=.env.local scripts/check-service-key.mjs");
}

if (!serviceRoleKey) {
  fail("SUPABASE_SERVICE_ROLE_KEY is not set. Load it via: node --env-file=.env.local scripts/check-service-key.mjs");
}

// The Auth admin API requires a service_role key. An anon key, a revoked key, or
// a typo all return 401 here, so this cleanly distinguishes a live service key.
const probeUrl = `${url.replace(/\/$/, "")}/auth/v1/admin/users?page=1&per_page=1`;

try {
  const response = await fetch(probeUrl, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (response.status === 200) {
    console.log("OK: service role key is live and has service_role privileges.");
    process.exit(0);
  }

  if (response.status === 401 || response.status === 403) {
    fail(`service role key was rejected (HTTP ${response.status}). It is revoked, wrong, or not a service_role key.`);
  }

  fail(`unexpected response from Supabase (HTTP ${response.status}). Check NEXT_PUBLIC_SUPABASE_URL.`);
} catch (error) {
  fail(`could not reach Supabase: ${error instanceof Error ? error.message : String(error)}`);
}
