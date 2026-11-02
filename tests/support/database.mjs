import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
export async function applyMigrationFile(db, name) {
  const sql = (await readFile(`db/migration/${name}`,'utf8')).replace(/^﻿/,'').replace('create extension if not exists pgcrypto;','');
  try { await db.exec(sql); } catch (error) { throw new Error(`Migration ${name}: ${error.message}`); }
}
// maxVersion lets an upgrade test stop at an older schema and apply later files itself.
export async function createTestDatabase({ maxVersion = Infinity } = {}) {
  const db = new PGlite();
  // Supabase platform schemas are stubbed locally; business migrations run as SQL.
  // PGlite has no pgcrypto: this test-only shim exercises token plumbing, not entropy.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema extensions;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
    $$;
    create function public.gen_random_bytes(n integer) returns bytea language sql volatile as $$
      select substring(decode(replace(gen_random_uuid()::text,'-',''),'hex') from 1 for n);
    $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key,bucket_id text,name text);
  `);
  const version = (name) => Number(name.match(/^V(\d+)/)[1]);
  const migrations = (await readdir('db/migration')).filter((name) => name.endsWith('.sql'))
    .filter((name) => version(name) <= maxVersion)
    .sort((a,b) => version(a)-version(b));
  for (const name of migrations) await applyMigrationFile(db, name);
  return db;
}
