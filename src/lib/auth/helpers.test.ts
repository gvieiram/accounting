// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();
const redirectMock = vi.fn((_url: string) => {
	throw new Error("REDIRECT");
});
let mockHeaders = new Headers();

vi.mock("@/lib/auth/auth", () => ({
	auth: {
		api: { getSession: getSessionMock },
	},
}));

vi.mock("@/lib/db", () => ({
	db: { user: { findUnique: findUniqueMock } },
}));

vi.mock("next/headers", () => ({
	headers: async () => mockHeaders,
}));

vi.mock("next/navigation", () => ({
	redirect: (url: string) => redirectMock(url),
}));

const { defaultDestinationForRole, requireAdmin, requireClient } = await import(
	"./helpers"
);

describe("defaultDestinationForRole", () => {
	it("maps ADMIN to /admin", () => {
		expect(defaultDestinationForRole("ADMIN")).toBe("/admin");
	});

	it("maps CLIENT to /app", () => {
		expect(defaultDestinationForRole("CLIENT")).toBe("/app");
	});
});

describe("requireAdmin", () => {
	beforeEach(() => {
		getSessionMock.mockReset();
		findUniqueMock.mockReset();
		redirectMock.mockClear();
		mockHeaders = new Headers();
	});

	it("redirects to /login when no session", async () => {
		getSessionMock.mockResolvedValueOnce(null);
		await expect(requireAdmin()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/login");
	});

	it("redirects to session_invalidated when User row is missing (orphan session)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "a@b.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce(null);

		await expect(requireAdmin()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith(
			"/login?error=session_invalidated",
		);
	});

	it("redirects to session_invalidated when user is revoked", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "a@b.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({
			role: "ADMIN",
			revokedAt: new Date(),
		});

		await expect(requireAdmin()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith(
			"/login?error=session_invalidated",
		);
	});

	// Cross-role redirect is silent — typing /admin while logged as CLIENT
	// is a "wrong door" UX event, not a security incident. The session
	// itself is still valid; only the destination is wrong. We bounce to
	// the role's correct subtree without writing audit logs or invalidating
	// the session. See `makeRoleGuard` in `helpers.ts` for rationale.
	it("silently redirects CLIENT visiting /admin to /app (no audit, no signOut)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "client@duohub.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "CLIENT", revokedAt: null });

		await expect(requireAdmin()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/app");
	});

	it("returns the session when user is active admin", async () => {
		const session = {
			user: { id: "u1", email: "a@b.com", name: "Admin" },
			session: { id: "s1" },
		};
		getSessionMock.mockResolvedValueOnce(session);
		findUniqueMock.mockResolvedValueOnce({ role: "ADMIN", revokedAt: null });

		const result = await requireAdmin();
		expect(result).toEqual(session);
		expect(redirectMock).not.toHaveBeenCalled();
	});
});

describe("requireClient", () => {
	beforeEach(() => {
		getSessionMock.mockReset();
		findUniqueMock.mockReset();
		redirectMock.mockClear();
		mockHeaders = new Headers();
	});

	it("redirects to /login when no session", async () => {
		getSessionMock.mockResolvedValueOnce(null);
		await expect(requireClient()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/login");
	});

	it("redirects to session_invalidated when User row is missing (orphan session)", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u2", email: "a@b.com" },
			session: { id: "s2" },
		});
		findUniqueMock.mockResolvedValueOnce(null);

		await expect(requireClient()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith(
			"/login?error=session_invalidated",
		);
	});

	it("redirects to session_invalidated when user is revoked", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u2", email: "a@b.com" },
			session: { id: "s2" },
		});
		findUniqueMock.mockResolvedValueOnce({
			role: "CLIENT",
			revokedAt: new Date(),
		});

		await expect(requireClient()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith(
			"/login?error=session_invalidated",
		);
	});

	// Mirror of the admin guard behaviour: ADMIN typing /app gets bounced
	// silently to /admin. No audit, no signOut.
	it("silently redirects ADMIN visiting /app to /admin", async () => {
		getSessionMock.mockResolvedValueOnce({
			user: { id: "u1", email: "admin@duohub.com" },
			session: { id: "s1" },
		});
		findUniqueMock.mockResolvedValueOnce({ role: "ADMIN", revokedAt: null });

		await expect(requireClient()).rejects.toThrow("REDIRECT");
		expect(redirectMock).toHaveBeenCalledWith("/admin");
	});

	it("returns the session when user is active client", async () => {
		const session = {
			user: { id: "u2", email: "client@duohub.com", name: "Client" },
			session: { id: "s2" },
		};
		getSessionMock.mockResolvedValueOnce(session);
		findUniqueMock.mockResolvedValueOnce({ role: "CLIENT", revokedAt: null });

		const result = await requireClient();
		expect(result).toEqual(session);
		expect(redirectMock).not.toHaveBeenCalled();
	});
});
