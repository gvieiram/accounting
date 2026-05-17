import type { UserRole } from "@/generated/prisma/enums";

import { defaultDestinationForRole } from "./role-destination";

/**
 * Resolves a user-supplied `next` query param into a safe internal path
 * for post-login redirection — role-aware.
 *
 * Anti open-redirect: untrusted input must never produce a redirect to
 * an external origin. Only paths under `/admin/*` and `/app/*` (the
 * authenticated areas) are valid destinations. Everything else falls
 * back to the role's default destination (`/admin` for ADMIN, `/app`
 * for CLIENT).
 *
 * Defends against:
 * - Absolute URLs (`https://evil.com`)
 * - Protocol-relative URLs (`//evil.com`)
 * - Backslash tricks that some parsers normalise to `/`
 * - Paths outside the authenticated areas (`/`, `/imposto-de-renda`)
 * - Dot-segment traversal (`/admin/..//evil.com`, `/admin/../../evil`).
 *   The naive `startsWith("/admin/")` check would let these pass; the
 *   browser then resolves the dot-segments per RFC 3986 §5.2 when
 *   following the `Location` header and lands on the attacker host.
 *   We normalise via the `URL` constructor (with a fixed sentinel
 *   origin) before applying the allow-list.
 *
 * Cross-role rejection (defence in depth):
 * - role=ADMIN  + next sub-tree `/app/*`   → fallback `/admin`
 * - role=CLIENT + next sub-tree `/admin/*` → fallback `/app`
 *
 * Pure function — no I/O, safe to import in any runtime.
 */
export function safeNext(
	next: string | undefined | null,
	role: UserRole,
): string {
	const fallback = defaultDestinationForRole(role);
	if (!next) return fallback;

	if (next.includes("://") || next.startsWith("//")) return fallback;

	if (next.includes("\\")) return fallback;

	const SENTINEL_ORIGIN = "https://internal.invalid";
	let resolved: URL;
	try {
		resolved = new URL(next, SENTINEL_ORIGIN);
	} catch {
		return fallback;
	}
	if (resolved.origin !== SENTINEL_ORIGIN) return fallback;

	const path = resolved.pathname;
	const isAdminPath = path === "/admin" || path.startsWith("/admin/");
	const isAppPath = path === "/app" || path.startsWith("/app/");
	if (!isAdminPath && !isAppPath) return fallback;

	// Cross-role rejection: the role determines which sub-tree is allowed.
	// An ADMIN with `?next=/app/...` falls back to `/admin`; a CLIENT with
	// `?next=/admin/...` falls back to `/app`. Defence in depth — the
	// destination layout's `requireAdmin` would also reject mismatches.
	if (role === "ADMIN" && !isAdminPath) return fallback;
	if (role === "CLIENT" && !isAppPath) return fallback;

	return path + resolved.search;
}
