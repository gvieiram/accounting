// @vitest-environment node

// biome-ignore-all lint/style/useNamingConvention: env vars use SCREAMING_SNAKE_CASE by convention

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("contactRatelimit", () => {
	beforeEach(() => {
		process.env.SKIP_ENV_VALIDATION = "true";
		process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
		process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
	});

	it("exports a ratelimit instance with a limit function", async () => {
		const { contactRatelimit } = await import("./ratelimit");
		expect(contactRatelimit).toBeDefined();
		expect(typeof contactRatelimit.limit).toBe("function");
	});

	it("reuses the same instance across imports (singleton)", async () => {
		const { contactRatelimit: first } = await import("./ratelimit");
		const { contactRatelimit: second } = await import("./ratelimit");
		expect(first).toBe(second);
	});
});

describe("rateLimitMagicLink", () => {
	beforeEach(() => {
		process.env.SKIP_ENV_VALIDATION = "true";
		process.env.UPSTASH_REDIS_REST_URL = "https://fake.upstash.io";
		process.env.UPSTASH_REDIS_REST_TOKEN = "fake-token";
	});

	it("returns true when all three limiters allow", async () => {
		const { rateLimitMagicLink } = await import("./ratelimit");
		const ok = await rateLimitMagicLink({
			email: "user@test.com",
			ipAddress: "1.2.3.4",
			_emailLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
			_ipLimiter: { limit: vi.fn().mockResolvedValue({ success: true }) },
			_globalLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
		});
		expect(ok).toBe(true);
	});

	it("returns false when email limiter blocks", async () => {
		const { rateLimitMagicLink } = await import("./ratelimit");
		const ok = await rateLimitMagicLink({
			email: "user@test.com",
			ipAddress: "1.2.3.4",
			_emailLimiter: {
				limit: vi.fn().mockResolvedValue({ success: false }),
			},
			_ipLimiter: { limit: vi.fn().mockResolvedValue({ success: true }) },
			_globalLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
		});
		expect(ok).toBe(false);
	});

	it("returns false when IP limiter blocks", async () => {
		const { rateLimitMagicLink } = await import("./ratelimit");
		const ok = await rateLimitMagicLink({
			email: "user@test.com",
			ipAddress: "1.2.3.4",
			_emailLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
			_ipLimiter: { limit: vi.fn().mockResolvedValue({ success: false }) },
			_globalLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
		});
		expect(ok).toBe(false);
	});

	it("returns false when global limiter blocks", async () => {
		const { rateLimitMagicLink } = await import("./ratelimit");
		const ok = await rateLimitMagicLink({
			email: "user@test.com",
			ipAddress: "1.2.3.4",
			_emailLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
			_ipLimiter: { limit: vi.fn().mockResolvedValue({ success: true }) },
			_globalLimiter: {
				limit: vi.fn().mockResolvedValue({ success: false }),
			},
		});
		expect(ok).toBe(false);
	});

	it("uses 'unknown' bucket when ipAddress is null", async () => {
		const { rateLimitMagicLink } = await import("./ratelimit");
		const ipLimit = vi.fn().mockResolvedValue({ success: true });
		await rateLimitMagicLink({
			email: "user@test.com",
			ipAddress: null,
			_emailLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
			_ipLimiter: { limit: ipLimit },
			_globalLimiter: {
				limit: vi.fn().mockResolvedValue({ success: true }),
			},
		});
		expect(ipLimit).toHaveBeenCalledWith("unknown");
	});
});
