import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/env";
import type { Database } from "./database.types";

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export type CurrentAdmin = {
  user: User;
  email: string;
  isAdmin: boolean;
};

function missingAuthConfig() {
  return !supabaseUrl || !supabaseAnonKey;
}

export function createSupabaseAuthServerClient() {
  if (missingAuthConfig()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. Middleware refreshes sessions.
        }
      }
    }
  });
}

export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  if (missingAuthConfig()) {
    return null;
  }

  const supabase = createSupabaseAuthServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || !isAdmin) {
    return null;
  }

  return {
    user: userData.user,
    email: userData.user.email ?? "Admin user",
    isAdmin: true
  };
}

export async function requireAdmin() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/admin/login?reason=auth-required");
  }

  return admin;
}