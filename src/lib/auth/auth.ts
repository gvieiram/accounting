import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";

import { sendMagicLinkEmail } from "@/features/auth/emails/dispatch";
import { looksLikeIp } from "@/lib/audit/extract-request-context";
import { auditLog } from "@/lib/audit/log";
import { withMinElapsed } from "@/lib/auth/anti-timing";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimitMagicLink } from "@/lib/ratelimit";
import { getSiteUrl } from "@/lib/site-url";

// Floor for the entire `sendMagicLink` flow. Tuned above the P90 of the
// "user exists + email dispatch" branch so the "user not found" branch
// can't be distinguished by total wall-clock latency.
const SEND_MAGIC_LINK_MIN_MS = 600;

function pickIpFromMetadata(bodyMetadata: unknown): string | null {
	if (
		bodyMetadata &&
		typeof bodyMetadata === "object" &&
		"ipAddress" in bodyMetadata &&
		typeof (bodyMetadata as { ipAddress: unknown }).ipAddress === "string"
	) {
		const raw = (bodyMetadata as { ipAddress: string }).ipAddress;
		return looksLikeIp(raw) ? raw : null;
	}
	return null;
}

function pickUaFromMetadata(bodyMetadata: unknown): string | null {
	if (
		bodyMetadata &&
		typeof bodyMetadata === "object" &&
		"userAgent" in bodyMetadata &&
		typeof (bodyMetadata as { userAgent: unknown }).userAgent === "string"
	) {
		const raw = (bodyMetadata as { userAgent: string }).userAgent.trim();
		// Cap pathologically long values; UA strings are typically < 512.
		return raw.length > 0 && raw.length <= 1024 ? raw : null;
	}
	return null;
}

/**
 * Core flow of `sendMagicLink`, lifted out so it can be wrapped in
 * `withMinElapsed` and tested independently of Better Auth's plugin shape.
 *
 * Audit-log policy:
 *   - Never write an AuditLog row for `email` values that don't match a
 *     real `User`. The endpoint accepts arbitrary input, so writing audit
 *     rows on those branches lets any unauthenticated caller flood the
 *     table with attacker-chosen `actorEmail` strings.
 *   - For users that exist but are revoked, also skip audit DB writes for
 *     the same reason: the attacker controls which revoked email to hit.
 *   - For real, non-revoked users we write `MAGIC_LINK_SENT`, both on the
 *     success path and when the per-email/IP/global rate-limit suppresses
 *     dispatch.
 */
async function handleSendMagicLink(params: {
	email: string;
	url: string;
	bodyMetadata: unknown;
	request: Request | undefined;
}): Promise<void> {
	const { email, url, bodyMetadata, request } = params;

	// Prefer headers from the synthesised Request (Better Auth populates this
	// on real HTTP calls). When the endpoint is invoked from a Server Action,
	// `ctx.request` is undefined and we fall back to caller-supplied
	// metadata — validated so a spoofed ipAddress is dropped, not persisted.
	const headerIp = request?.headers
		.get("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	const headerUa = request?.headers.get("user-agent")?.trim();

	const ipAddress =
		(headerIp && looksLikeIp(headerIp) ? headerIp : null) ??
		pickIpFromMetadata(bodyMetadata);
	const userAgent = headerUa || pickUaFromMetadata(bodyMetadata);

	const user = await db.user.findUnique({
		where: { email },
		select: { id: true, name: true, revokedAt: true },
	});

	if (!user || user.revokedAt) {
		// Anti-flood: do NOT persist audit rows for caller-controlled emails.
		// Server console preserves forensics for SRE without exposing the table
		// to amplification. `withMinElapsed` flattens the timing difference.
		console.warn(
			`[auth] magic link suppressed (${
				!user ? "user_not_found" : "user_revoked"
			}) from ${ipAddress ?? "unknown"}`,
		);
		return;
	}

	const allowed = await rateLimitMagicLink({ email, ipAddress });
	if (!allowed) {
		await auditLog.write({
			action: "MAGIC_LINK_SENT",
			actorEmail: email,
			actorId: user.id,
			metadata: { suppressed: true, reason: "rate_limited" },
			ipAddress,
			userAgent,
		});
		return;
	}

	await sendMagicLinkEmail({
		to: email,
		magicLinkUrl: url,
		recipientName: user.name,
	});

	await auditLog.write({
		action: "MAGIC_LINK_SENT",
		actorEmail: email,
		actorId: user.id,
		ipAddress,
		userAgent,
	});
}

// `getSiteUrl()` resolves at module-init time:
//   - prod: NEXT_PUBLIC_SITE_URL (canonical) → VERCEL_PROJECT_PRODUCTION_URL
//   - preview: VERCEL_URL (this preview's own URL) so magic links land where
//     the deploy is actually serving requests, no per-preview env required
//   - local: http://localhost:3000
// This avoids hard-coding a `BETTER_AUTH_URL` env that we'd have to manage
// per preview deploy.
const siteUrl = getSiteUrl();

export const auth = betterAuth({
	database: prismaAdapter(db, { provider: "postgresql" }),
	secret: env.BETTER_AUTH_SECRET,
	baseURL: siteUrl,
	emailAndPassword: { enabled: false },
	session: {
		expiresIn: 60 * 60 * 24 * 7,
		updateAge: 60 * 60 * 24,
		cookieCache: { enabled: true, maxAge: 60 * 5 },
	},
	experimental: { joins: true },
	trustedOrigins: [siteUrl],
	plugins: [
		magicLink({
			expiresIn: 60 * 15,
			disableSignUp: true,
			storeToken: "hashed",
			sendMagicLink: async ({ email, url, metadata: bodyMetadata }, ctx) =>
				withMinElapsed(
					handleSendMagicLink({
						email,
						url,
						bodyMetadata,
						request: ctx?.request,
					}),
					SEND_MAGIC_LINK_MIN_MS,
				),
		}),
		nextCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;
