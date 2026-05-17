import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { UserRole } from "@/generated/prisma/enums";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { defaultDestinationForRole } from "./role-destination";

export { defaultDestinationForRole } from "./role-destination";

export async function getCurrentUser() {
	const session = await auth.api.getSession({ headers: await headers() });
	return session?.user ?? null;
}

export async function getSession() {
	return auth.api.getSession({ headers: await headers() });
}

/**
 * Shared role-guard implementation backing `requireAdmin` and
 * `requireClient`. Kept private so callers always go through the named
 * helpers — simpler grep, simpler audit story.
 *
 * Cross-role mismatch (e.g. ADMIN visiting `/app`) is treated as a
 * "wrong door" UX event, not a security incident: we silently redirect
 * to the role's correct destination. Rationale:
 *
 * - The `/post-login` trampoline already routes correctly after every
 *   real authentication, so reaching the wrong layout means the user
 *   typed the URL, used a stale bookmark, or bounced between tabs.
 *   None of those are bypass attempts — bouncing them with a forbidden
 *   error + audit + signOut would be hostile and noisy.
 * - The session itself is still valid; only the destination is wrong.
 *   No reason to nuke the cookie or write an `AuditLog` row.
 * - `safeNext` already rejects cross-role `?next=` values, so the user
 *   typing `/admin/x` while logged as CLIENT just lands here once and
 *   gets bounced to `/app` cleanly.
 *
 * Failure modes that *do* warrant hard treatment stay hard:
 *
 * - No session reaching the layout: shouldn't happen in practice (the
 *   Edge proxy redirects unauthenticated traffic at the cookie check),
 *   but if it slips through we send to `/login` so the user authenticates.
 * - User row missing or revoked: legitimately invalid state — bounce to
 *   `/login?error=session_invalidated` so the form surfaces it.
 *
 * Wrapped in `React.cache` so layout + page + any nested Server Component
 * dedupes the `db.user.findUnique` within a single render.
 */
function makeRoleGuard(expected: UserRole) {
	return cache(async () => {
		const reqHeaders = await headers();
		const session = await auth.api.getSession({ headers: reqHeaders });

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

		if (user.role !== expected) {
			redirect(defaultDestinationForRole(user.role));
		}

		return session;
	});
}

/** Guard for admin-only Server Components. See `makeRoleGuard`. */
export const requireAdmin = makeRoleGuard("ADMIN");

/** Guard for client-only Server Components. See `makeRoleGuard`. */
export const requireClient = makeRoleGuard("CLIENT");
