import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/env";
import type { Database } from "./database.types";

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const supabaseServiceRoleKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

const serverAuthOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
};

export function hasSupabasePublicConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasSupabaseServiceConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function createSupabasePublicServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, serverAuthOptions);
}

export function createSupabaseServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, serverAuthOptions);
}
