import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/helpers";
import { safeNext } from "@/lib/auth/safe-redirect";
import { db } from "@/lib/db";

export const metadata: Metadata = {
	robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/**
 * Post-login routing trampoline.
 *
 * Better Auth's magic-link `callbackURL` lands here right after a successful
 * verify. The action that requested the link cannot peek at `user.role`
 * without leaking enumeration timing (it doesn't even know if the email
 * exists), so the role-aware destination decision is moved to this page —
 * which runs *after* the session is established and can safely read the
 * role from the database.
 *
 * Security model:
 *
 * - 100% server-rendered. Zero client JS. Renders no HTML — the only output
 *   is a 307 `Location` header. There's nothing the browser can manipulate.
 * - Reads `user.role` from the database, never from the cookie/session
 *   payload. Better Auth's session token is opaque; role is app-level data.
 * - The optional `?next=` is sanitized through `safeNext(next, role)` which
 *   already handles open-redirect, dot-segment traversal, and cross-role
 *   abuse (admin with `?next=/app/*` falls back to `/admin` and vice versa).
 * - `requireAdmin()` in `/admin/layout.tsx` remains the second line of
 *   defence. If anything bypasses this trampoline (URL manipulation,
 *   cookie theft, future router bug) the layout still blocks mismatched
 *   roles. Two independent layers, OWASP A01 style.
 *
 * Failure modes are explicit fall-throughs to `/login`:
 *
 * - No session → user got here without authenticating. Send to login.
 * - Orphan session (User row deleted) or revoked user → invalid state,
 *   bounce to login with `session_invalidated` so the form surfaces it.
 * - Session valid, role active → `safeNext` resolves and we redirect.
 */
export default async function PostLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const params = await searchParams;
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: { role: true, revokedAt: true },
	});

	if (!user || user.revokedAt) {
		redirect("/login?error=session_invalidated");
	}

	redirect(safeNext(params.next, user.role));
}
