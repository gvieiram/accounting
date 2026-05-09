import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/lib/env";

const globalForRatelimit = globalThis as unknown as {
	redis: Redis | undefined;
	contactRatelimit: Ratelimit | undefined;
	magicLinkRateLimitByEmail: Ratelimit | undefined;
	magicLinkRateLimitByIp: Ratelimit | undefined;
	magicLinkRateLimitGlobal: Ratelimit | undefined;
	inviteAcceptRateLimitByIp: Ratelimit | undefined;
};

function createRedis(): Redis {
	return new Redis({
		url: env.UPSTASH_REDIS_REST_URL,
		token: env.UPSTASH_REDIS_REST_TOKEN,
	});
}

const redis = globalForRatelimit.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.redis = redis;
}

function createContactRatelimit(): Ratelimit {
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(5, "1 h"),
		analytics: true,
		prefix: "ratelimit:contact",
	});
}

export const contactRatelimit =
	globalForRatelimit.contactRatelimit ?? createContactRatelimit();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.contactRatelimit = contactRatelimit;
}

function createMagicLinkRateLimitByEmail(): Ratelimit {
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(3, "15 m"),
		analytics: true,
		prefix: "ratelimit:magic-link:email",
	});
}

export const magicLinkRateLimitByEmail =
	globalForRatelimit.magicLinkRateLimitByEmail ??
	createMagicLinkRateLimitByEmail();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.magicLinkRateLimitByEmail = magicLinkRateLimitByEmail;
}

function createMagicLinkRateLimitByIp(): Ratelimit {
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(10, "1 h"),
		analytics: true,
		prefix: "ratelimit:magic-link:ip",
	});
}

export const magicLinkRateLimitByIp =
	globalForRatelimit.magicLinkRateLimitByIp ?? createMagicLinkRateLimitByIp();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.magicLinkRateLimitByIp = magicLinkRateLimitByIp;
}

function createMagicLinkRateLimitGlobal(): Ratelimit {
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(100, "1 h"),
		analytics: true,
		prefix: "ratelimit:magic-link:global",
	});
}

export const magicLinkRateLimitGlobal =
	globalForRatelimit.magicLinkRateLimitGlobal ??
	createMagicLinkRateLimitGlobal();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.magicLinkRateLimitGlobal = magicLinkRateLimitGlobal;
}

function createInviteAcceptRateLimitByIp(): Ratelimit {
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(20, "1 h"),
		analytics: true,
		prefix: "ratelimit:invite-accept:ip",
	});
}

export const inviteAcceptRateLimitByIp =
	globalForRatelimit.inviteAcceptRateLimitByIp ??
	createInviteAcceptRateLimitByIp();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.inviteAcceptRateLimitByIp = inviteAcceptRateLimitByIp;
}

type MagicLinkLimiter = {
	limit: (id: string) => Promise<{ success: boolean }>;
};

export type RateLimitMagicLinkInput = {
	email: string;
	ipAddress: string | null;
	_emailLimiter?: MagicLinkLimiter;
	_ipLimiter?: MagicLinkLimiter;
	_globalLimiter?: MagicLinkLimiter;
};

export async function rateLimitMagicLink(
	input: RateLimitMagicLinkInput,
): Promise<boolean> {
	const emailLimiter = input._emailLimiter ?? magicLinkRateLimitByEmail;
	const ipLimiter = input._ipLimiter ?? magicLinkRateLimitByIp;
	const globalLimiter = input._globalLimiter ?? magicLinkRateLimitGlobal;

	const ipKey = input.ipAddress ?? "unknown";

	const [emailRes, ipRes, globalRes] = await Promise.all([
		emailLimiter.limit(input.email),
		ipLimiter.limit(ipKey),
		globalLimiter.limit("global"),
	]);

	return emailRes.success && ipRes.success && globalRes.success;
}
