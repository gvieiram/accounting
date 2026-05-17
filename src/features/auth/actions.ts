"use server";

import { headers } from "next/headers";

import { auditLog } from "@/lib/audit/log";
import { auth } from "@/lib/auth/auth";
import { loginSchema } from "./schemas";

export type LoginActionResult = { ok: true };
export type LogoutActionResult = { ok: true };

function extractClientContext(reqHeaders: Headers) {
	const ipAddress =
		reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		reqHeaders.get("x-real-ip")?.trim() ??
		null;
	const userAgent = reqHeaders.get("user-agent")?.trim() ?? null;
	return { ipAddress, userAgent };
}

/**
 * Build the magic-link callbackURL.
 *
 * After verify, Better Auth redirects the browser to this URL — we send the
 * user through `/post-login`, which is a server-side trampoline that reads
 * `user.role` from the DB and redirects to `/admin` or `/app` accordingly.
 * The trampoline's job is documented in `src/app/(public-app)/post-login/page.tsx`.
 *
 * The optional `next` from the form is forwarded as a query param so the
 * trampoline can honour it through `safeNext(next, role)` (which already
 * blocks open-redirects and cross-role abuse).
 *
 * Anti-enumeration: this action runs without a session and cannot look up
 * the email's role here without leaking existence/timing info. Centralising
 * the role-aware redirect in the trampoline (post-session) is the only safe
 * place to do it.
 */
function buildPostLoginCallbackUrl(next: string | undefined): string {
	if (!next) return "/post-login";
	const params = new URLSearchParams({ next });
	return `/post-login?${params.toString()}`;
}

export async function sendLoginMagicLinkAction(
	input: unknown,
): Promise<LoginActionResult> {
	const parsed = loginSchema.safeParse(input);

	if (!parsed.success) {
		return { ok: true };
	}

	const reqHeaders = await headers();
	// Better Auth does not synthesise `ctx.request` when the endpoint is
	// invoked from a Server Action, so IP and User-Agent must travel through
	// `body.metadata` to reach the `sendMagicLink` callback (and the audit
	// log) intact.
	const { ipAddress, userAgent } = extractClientContext(reqHeaders);

	try {
		await auth.api.signInMagicLink({
			body: {
				email: parsed.data.email,
				callbackURL: buildPostLoginCallbackUrl(parsed.data.next),
				// Without `errorCallbackURL`, Better Auth appends `?error=...` to
				// `callbackURL`, which would land users with an expired/invalid
				// link on `/post-login?error=EXPIRED_TOKEN` — but no session
				// exists to drive the trampoline. Sending them back to `/login`
				// lets the form surface the error and request a fresh link.
				errorCallbackURL: "/login",
				metadata: { ipAddress, userAgent },
			},
			headers: reqHeaders,
		});
	} catch {
		// Swallow — anti-enumeration. Failures are auditable on the server.
	}

	return { ok: true };
}

/**
 * Sign the user out and write a `USER_LOGOUT` audit row.
 *
 * The audit row is written BEFORE `signOut()` so the actor identity (which
 * Better Auth wipes once the session is gone) is still readable. We always
 * return `{ ok: true }` — even on signOut failure — because the client
 * relies on the redirect happening regardless. Any failure is logged
 * server-side via auditLog's own fail-soft path.
 */
export async function logoutAction(): Promise<LogoutActionResult> {
	const reqHeaders = await headers();
	const { ipAddress, userAgent } = extractClientContext(reqHeaders);

	try {
		const session = await auth.api.getSession({ headers: reqHeaders });
		if (session) {
			await auditLog.write({
				action: "USER_LOGOUT",
				actorId: session.user.id,
				actorEmail: session.user.email,
				ipAddress,
				userAgent,
			});
		}
		await auth.api.signOut({ headers: reqHeaders });
	} catch {
		// Swallow — the client-side authClient.signOut() also wipes the cookie
		// as a fallback. Audit failures are visible in `auditLog.write` logs.
	}

	return { ok: true };
}
