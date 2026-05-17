import type { UserRole } from "@/generated/prisma/enums";

// `Record<UserRole, string>` keeps role coverage compile-time enforced:
// when a new role is added to the Prisma enum, TypeScript fails here
// until a destination is mapped. Cheaper than a runtime `default:` branch.
const ROLE_DESTINATION: Record<UserRole, string> = {
	// biome-ignore lint/style/useNamingConvention: Prisma enum values are SCREAMING_CASE
	ADMIN: "/admin",
	// biome-ignore lint/style/useNamingConvention: Prisma enum values are SCREAMING_CASE
	CLIENT: "/app",
};

/**
 * Default post-login destination for a given role. Used by `safeNext`
 * as the role-aware fallback and by the `/login` page when no `?next=`
 * is supplied.
 *
 * Lives in its own module (not `helpers.ts`) so `safe-redirect.ts` can
 * stay pure — `helpers.ts` is `server-only` and pulls Prisma + Better
 * Auth, which would contaminate `safeNext`'s pure-function contract
 * and break the unit tests' lightweight setup.
 */
export function defaultDestinationForRole(role: UserRole): string {
	return ROLE_DESTINATION[role];
}
