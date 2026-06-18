import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set these in your .env.local file.",
  );
}

const URL: string = supabaseUrl;
const KEY: string = supabaseAnonKey;

/**
 * NOTE: We intentionally do NOT pass the generated Database type to the
 * client here. supabase-js v2.108's type system is extremely strict and
 * hard to keep in sync with a hand-maintained schema. Instead, we use the
 * typed mappers in lib/mappers.ts as the type-safety boundary, and use
 * `.returns<Type[]>()` at call sites to assert the row shape.
 */
export function createClient() {
  return createBrowserClient(URL, KEY);
}

export const supabase = createClient();
