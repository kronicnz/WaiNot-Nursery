import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

export function createSupabase(request: Request, cookies: AstroCookies) {
  return createServerClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get('Cookie') ?? '').map((c) => ({ name: c.name, value: c.value ?? '' })),
      setAll: (list) =>
        list.forEach(({ name, value, options }) =>
          cookies.set(name, value, { ...options, httpOnly: true, sameSite: 'lax', secure: import.meta.env.PROD, path: '/' }),
        ),
    },
  });
}

// Service-role client: bypasses RLS. Only use after an explicit owner check.
export function createAdminClient() {
  const key = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return createClient(import.meta.env.PUBLIC_SUPABASE_URL, key, { auth: { persistSession: false } });
}
