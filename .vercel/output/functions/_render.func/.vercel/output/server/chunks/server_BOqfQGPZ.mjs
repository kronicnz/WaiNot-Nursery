import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
//#region src/lib/supabase/server.ts
function createSupabase(request, cookies) {
	return createServerClient("http://127.0.0.1:54321", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0", { cookies: {
		getAll: () => parseCookieHeader(request.headers.get("Cookie") ?? "").map((c) => ({
			name: c.name,
			value: c.value ?? ""
		})),
		setAll: (list) => list.forEach(({ name, value, options }) => cookies.set(name, value, {
			...options,
			httpOnly: true,
			sameSite: "lax",
			secure: true,
			path: "/"
		}))
	} });
}
function createAdminClient() {
	return createClient("http://127.0.0.1:54321", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU", { auth: { persistSession: false } });
}
//#endregion
export { createSupabase as n, createAdminClient as t };
