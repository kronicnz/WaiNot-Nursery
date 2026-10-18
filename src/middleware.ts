import { defineMiddleware } from 'astro:middleware';
import { createSupabase } from './lib/supabase/server';

const PUBLIC_PATHS = new Set(['/admin/login', '/api/auth/login']);
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(import.meta.env.PUBLIC_SUPABASE_URL).origin;
  } catch {
    return '';
  }
})();
const PRODUCT_IMAGE_ORIGIN = 'https://dzpdbgwih7u1r.cloudfront.net';

function applyHeaders(res: Response, appArea: boolean) {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  if (appArea) {
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('Cache-Control', 'no-store');
    res.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    res.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob: ${SUPABASE_ORIGIN} ${PRODUCT_IMAGE_ORIGIN}`,
        `connect-src 'self' ${SUPABASE_ORIGIN}`,
        "media-src 'self' blob:",
        "worker-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),
    );
  }
  return res;
}

const deny = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: { 'Content-Type': 'application/json' } });

export const onRequest = defineMiddleware(async (ctx, next) => {
  const path = ctx.url.pathname;
  const isApi = path.startsWith('/api/');
  const isAdmin = path === '/admin' || path.startsWith('/admin/');
  if (!isApi && !isAdmin) return applyHeaders(await next(), false);

  ctx.locals.user = null;
  ctx.locals.role = null;

  // CSRF: state-changing API calls must be same-origin JSON (or multipart for uploads).
  if (isApi && !['GET', 'HEAD', 'OPTIONS'].includes(ctx.request.method)) {
    const origin = ctx.request.headers.get('Origin');
    if (origin !== ctx.url.origin) return applyHeaders(deny(403, 'Cross-origin request blocked'), true);
  }

  const supabase = createSupabase(ctx.request, ctx.cookies);
  ctx.locals.supabase = supabase;

  if (!PUBLIC_PATHS.has(path)) {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    let role: 'owner' | 'staff' | null = null;
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('role, active').eq('id', user.id).maybeSingle();
      if (profile?.active) role = profile.role as 'owner' | 'staff';
    }
    if (!user || !role) {
      if (isApi) return applyHeaders(deny(401, 'Authentication required'), true);
      return applyHeaders(ctx.redirect('/admin/login'), true);
    }
    ctx.locals.user = user;
    ctx.locals.role = role;
  }

  return applyHeaders(await next(), true);
});
