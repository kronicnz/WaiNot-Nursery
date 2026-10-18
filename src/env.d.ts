/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
}

declare namespace App {
  interface Locals {
    user: import('@supabase/supabase-js').User | null;
    role: 'owner' | 'staff' | null;
    supabase: import('@supabase/supabase-js').SupabaseClient;
  }
}
