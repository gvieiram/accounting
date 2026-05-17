// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const signInMagicLinkMock = vi.fn();
const signOutMock = vi.fn();
const getSessionMock = vi.fn();
const auditWriteMock = vi.fn();
let mockHeaders = new Headers();

vi.mock("@/lib/auth/auth", () => ({
	auth: {
		api: {
			signInMagicLink: signInMagicLinkMock,
			signOut: signOutMock,
			getSession: getSessionMock,
		},
	},
}));

vi.mock("@/lib/audit/log", () => ({
	auditLog: { write: auditWriteMock },
}));

vi.mock("next/headers", () => ({
	headers: async () => mockHeaders,
}));

const { sendLoginMagicLinkAction, logoutAction } = await import("./actions");

describe("sendLoginMagicLinkAction", () => {
	beforeEach(() => {
		signInMagicLinkMock.mockReset();
		signInMagicLinkMock.mockResolvedValue({});
		mockHeaders = new Headers();
	});

	it("returns ok:true with uniform shape on valid input", async () => {
		const r = await sendLoginMagicLinkAction({
			email: "user@test.com",
			next: "/admin",
		});
		expect(r).toEqual({ ok: true });
	});

	it("returns ok:true even when email is invalid (uniform response)", async () => {
		const r = await sendLoginMagicLinkAction({
			email: "not-an-email",
		});
		expect(r).toEqual({ ok: true });
		expect(signInMagicLinkMock).not.toHaveBeenCalled();
	});

	it("returns ok:true even when better-auth throws (uniform response)", async () => {
		signInMagicLinkMock.mockRejectedValueOnce(new Error("transient"));
		const r = await sendLoginMagicLinkAction({ email: "user@test.com" });
		expect(r).toEqual({ ok: true });
	});

	it("routes the magic-link callback through /post-login with next encoded", async () => {
		await sendLoginMagicLinkAction({
			email: "user@test.com",
			next: "/admin/clients",
		});
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.callbackURL).toBe("/post-login?next=%2Fadmin%2Fclients");
		expect(arg?.body?.errorCallbackURL).toBe("/login");
	});

	it("routes to /post-login without query when next is missing", async () => {
		await sendLoginMagicLinkAction({ email: "user@test.com" });
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.callbackURL).toBe("/post-login");
	});

	it("encodes a CLIENT-area next through /post-login (the trampoline sanitises it)", async () => {
		await sendLoginMagicLinkAction({
			email: "user@test.com",
			next: "/app/dashboard",
		});
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.callbackURL).toBe("/post-login?next=%2Fapp%2Fdashboard");
	});

	it("sends users back to /login on verification errors", async () => {
		await sendLoginMagicLinkAction({ email: "user@test.com" });
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.errorCallbackURL).toBe("/login");
	});

	it("forwards client IP and User-Agent via body.metadata", async () => {
		mockHeaders = new Headers({
			"x-forwarded-for": "203.0.113.42, 10.0.0.1",
			"user-agent": "Mozilla/5.0 (Test)",
		});
		await sendLoginMagicLinkAction({ email: "user@test.com" });
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.metadata).toEqual({
			ipAddress: "203.0.113.42",
			userAgent: "Mozilla/5.0 (Test)",
		});
	});

	it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
		mockHeaders = new Headers({ "x-real-ip": "198.51.100.7" });
		await sendLoginMagicLinkAction({ email: "user@test.com" });
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.metadata?.ipAddress).toBe("198.51.100.7");
	});

	it("sends metadata with null IP/UA when no headers present", async () => {
		await sendLoginMagicLinkAction({ email: "user@test.com" });
		const arg = signInMagicLinkMock.mock.calls[0]?.[0];
		expect(arg?.body?.metadata).toEqual({
			ipAddress: null,
			userAgent: null,
		});
	});
});

describe("logoutAction", () => {
	beforeEach(() => {
		signOutMock.mockReset();
		signOutMock.mockResolvedValue({});
		getSessionMock.mockReset();
		auditWriteMock.mockReset();
		auditWriteMock.mockResolvedValue(undefined);
		mockHeaders = new Headers();
	});

	it("writes USER_LOGOUT audit row before signOut when session exists", async () => {
		getSessionMock.mockResolvedValue({
			user: { id: "user-123", email: "admin@duohub.com" },
		});
		mockHeaders = new Headers({
			"x-forwarded-for": "203.0.113.42",
			"user-agent": "Mozilla/5.0 (Test)",
		});

		const r = await logoutAction();

		expect(r).toEqual({ ok: true });
		expect(auditWriteMock).toHaveBeenCalledWith({
			action: "USER_LOGOUT",
			actorId: "user-123",
			actorEmail: "admin@duohub.com",
			ipAddress: "203.0.113.42",
			userAgent: "Mozilla/5.0 (Test)",
		});
		expect(signOutMock).toHaveBeenCalledTimes(1);
	});

	it("skips audit write when no session is found", async () => {
		getSessionMock.mockResolvedValue(null);

		const r = await logoutAction();

		expect(r).toEqual({ ok: true });
		expect(auditWriteMock).not.toHaveBeenCalled();
		expect(signOutMock).toHaveBeenCalledTimes(1);
	});

	it("returns ok:true even when signOut throws (uniform response)", async () => {
		getSessionMock.mockResolvedValue({
			user: { id: "user-123", email: "admin@duohub.com" },
		});
		signOutMock.mockRejectedValueOnce(new Error("network"));

		const r = await logoutAction();

		expect(r).toEqual({ ok: true });
	});
});
