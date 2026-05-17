// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();
const redirectMock = vi.fn((_url: string) => {
	throw new Error("REDIRECT");
});

vi.mock("@/lib/auth/helpers", () => ({
	getSession: getSessionMock,
}));

vi.mock("@/lib/db", () => ({
	db: { user: { findUnique: findUniqueMock } },
}));

vi.mock("next/navigation", () => ({
	redirect: (url: string) => redirectMock(url),
}));

const { default: PostLoginPage } = await import("./page");

function makeProps(next?: string) {
	return { searchParams: Promise.resolve({ next }) };
}

describe("/post-login page", () => {
	beforeEach(() => {
		getSessionMock.mockReset();
		findUniqueMock.mockReset();
		redirectMock.mockClear();
	});

	it("redirects to /login when no session", async () => {
		getSessionMock.mockResolvedValueOnce(null);
		await expect(PostLoginPage(makeProps())).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/login");
		expect(findUniqueMock).not.toHaveBeenCalled();
	});

	it("redirects with session_invalidated when User row is missing (orphan session)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "a@b.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce(null);

		await expect(PostLoginPage(makeProps())).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith(
			"/login?error=session_invalidated",
		);
	});

	it("redirects with session_invalidated when user is revoked", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "a@b.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({
			role: "ADMIN",
			revokedAt: new Date(),
		});

		await expect(PostLoginPage(makeProps())).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith(
			"/login?error=session_invalidated",
		);
	});

	it("routes ADMIN to /admin when no `next` is provided", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "admin@duohub.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "ADMIN", revokedAt: null });

		await expect(PostLoginPage(makeProps())).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/admin");
	});

	it("routes CLIENT to /app when no `next` is provided", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u2", email: "client@duohub.com" },
			session: { id: "s2" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "CLIENT", revokedAt: null });

		await expect(PostLoginPage(makeProps())).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/app");
	});

	it("preserves a valid same-role `next` for ADMIN", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "admin@duohub.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "ADMIN", revokedAt: null });

		await expect(PostLoginPage(makeProps("/admin/clients"))).rejects.toThrow(
			"REDIRECT",
		);
		expect(redirectMock).toHaveBeenCalledWith("/admin/clients");
	});

	it("preserves a valid same-role `next` for CLIENT", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u2", email: "client@duohub.com" },
			session: { id: "s2" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "CLIENT", revokedAt: null });

		await expect(PostLoginPage(makeProps("/app/dashboard"))).rejects.toThrow(
			"REDIRECT",
		);
		expect(redirectMock).toHaveBeenCalledWith("/app/dashboard");
	});

	it("rejects cross-role `next` for ADMIN (next=/app/* falls back to /admin)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "admin@duohub.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "ADMIN", revokedAt: null });

		await expect(PostLoginPage(makeProps("/app/dashboard"))).rejects.toThrow(
			"REDIRECT",
		);
		expect(redirectMock).toHaveBeenCalledWith("/admin");
	});

	it("rejects cross-role `next` for CLIENT (next=/admin/* falls back to /app)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u2", email: "client@duohub.com" },
			session: { id: "s2" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "CLIENT", revokedAt: null });

		await expect(PostLoginPage(makeProps("/admin/clients"))).rejects.toThrow(
			"REDIRECT",
		);
		expect(redirectMock).toHaveBeenCalledWith("/app");
	});

	it("rejects external `next` (open-redirect attempt)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "admin@duohub.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "ADMIN", revokedAt: null });

		await expect(PostLoginPage(makeProps("https://evil.com"))).rejects.toThrow(
			"REDIRECT",
		);
		expect(redirectMock).toHaveBeenCalledWith("/admin");
	});

	it("looks up role from the database, not from the session payload", async () => {
		// Defence-in-depth: even if Better Auth ever exposed `role` in the
		// session shape, we must read from the canonical source (DB) so
		// runtime privilege downgrades take effect immediately.
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "admin@duohub.com", role: "ADMIN" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "CLIENT", revokedAt: null });

		await expect(PostLoginPage(makeProps())).rejects.toThrow("REDIRECT");
		// The DB role wins → /app, not the session-payload role → /admin.
		expect(redirectMock).toHaveBeenCalledWith("/app");
	});
});
