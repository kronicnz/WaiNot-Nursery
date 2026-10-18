import type { APIContext } from 'astro';
import type { ZodType } from 'zod';

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

export const fail = (message: string, status = 400, details?: unknown) => json({ error: message, details }, status);

export function requireOwner(ctx: APIContext): Response | null {
  return ctx.locals.role === 'owner' ? null : fail('Owner access required', 403);
}

// Parses and validates a JSON body. Returns either data or a ready 400 response.
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<{ data: T } | { error: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: fail('Invalid JSON body') };
  }
  const r = schema.safeParse(raw);
  if (!r.success) return { error: fail('Validation failed', 400, r.error.flatten()) };
  return { data: r.data };
}

export function parseQuery<T>(params: URLSearchParams, schema: ZodType<T>): { data: T } | { error: Response } {
  const r = schema.safeParse(Object.fromEntries(params));
  if (!r.success) return { error: fail('Validation failed', 400, r.error.flatten()) };
  return { data: r.data };
}

interface DbError {
  message?: string;
  code?: string;
}

// Maps database errors to safe client responses without leaking internals.
export function dbError(err: DbError): Response {
  const msg = err.message ?? '';
  if (err.code === '42501' || /row-level security|not authorised|owner only/i.test(msg)) return fail('Forbidden', 403);
  if (/insufficient stock/i.test(msg)) return fail('Insufficient stock', 409);
  if (/batch is archived|batch must have zero stock/i.test(msg)) return fail(msg, 409);
  if (err.code === '23505') return fail('Already exists', 409);
  if (err.code === '23503') return fail('Referenced record is missing or still in use', 409);
  if (err.code === '23514' || /must be|invalid|unknown|does not belong|differ|not open/i.test(msg)) return fail(msg, 400);
  console.error('db error', err);
  return fail('Server error', 500);
}

export function parsePaging(params: URLSearchParams, maxLimit = 100) {
  const limit = Math.min(Math.max(parseInt(params.get('limit') ?? '50', 10) || 50, 1), maxLimit);
  const offset = Math.max(parseInt(params.get('offset') ?? '0', 10) || 0, 0);
  return { limit, offset };
}

// Escapes characters that are special in PostgREST filter expressions.
export const sanitizeSearch = (s: string) => s.replace(/[%_,()*\\]/g, ' ').trim().slice(0, 80);
