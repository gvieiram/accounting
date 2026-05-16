// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auditLogCreateMock = vi.fn();

vi.mock("@/lib/db", () => ({
	db: { auditLog: { create: auditLogCreateMock } },
}));

const { auditLog } = await import("./log");

describe("auditLog.write — happy path", () => {
	beforeEach(() => {
		auditLogCreateMock.mockReset();
		auditLogCreateMock.mockResolvedValue({ id: "log_1" });
	});

	it("writes an entry with the provided fields", async () => {
		await auditLog.write({
			action: "USER_LOGIN_SUCCESS",
			actorId: "user_1",
			actorEmail: "admin@duohubcontabil.com.br",
		});

		expect(auditLogCreateMock).toHaveBeenCalledWith({
			data: {
				action: "USER_LOGIN_SUCCESS",
				actorId: "user_1",
				actorEmail: "admin@duohubcontabil.com.br",
				resourceType: undefined,
				resourceId: undefined,
				metadata: undefined,
				ipAddress: null,
				userAgent: null,
			},
		});
	});

	it("forwards resource fields when given", async () => {
		await auditLog.write({
			action: "CLIENT_CREATED",
			actorId: "user_1",
			actorEmail: "admin@duohubcontabil.com.br",
			resourceType: "Client",
			resourceId: "client_42",
			metadata: { legalName: "ACME LTDA" },
		});

		const call = auditLogCreateMock.mock.calls[0]?.[0];
		expect(call?.data.resourceType).toBe("Client");
		expect(call?.data.resourceId).toBe("client_42");
		expect(call?.data.metadata).toEqual({ legalName: "ACME LTDA" });
	});
});

describe("auditLog.write — request context", () => {
	beforeEach(() => {
		auditLogCreateMock.mockReset();
		auditLogCreateMock.mockResolvedValue({ id: "log_2" });
	});

	it("extracts IP and User-Agent from request and persists them", async () => {
		const request = new Request("https://example.com", {
			headers: {
				"x-forwarded-for": "203.0.113.7",
				"user-agent": "DuoHub-Tests/1.0",
			},
		});

		await auditLog.write({
			action: "MAGIC_LINK_SENT",
			actorEmail: "admin@duohubcontabil.com.br",
			request,
		});

		const call = auditLogCreateMock.mock.calls[0]?.[0];
		expect(call?.data.ipAddress).toBe("203.0.113.7");
		expect(call?.data.userAgent).toBe("DuoHub-Tests/1.0");
	});

	it("persists null IP/UA when no request is provided", async () => {
		await auditLog.write({
			action: "USER_LOGOUT",
			actorId: "user_1",
			actorEmail: "admin@duohubcontabil.com.br",
		});

		const call = auditLogCreateMock.mock.calls[0]?.[0];
		expect(call?.data.ipAddress).toBeNull();
		expect(call?.data.userAgent).toBeNull();
	});

	it("uses explicit ipAddress/userAgent inputs (Server Action path)", async () => {
		await auditLog.write({
			action: "MAGIC_LINK_SENT",
			actorEmail: "admin@duohubcontabil.com.br",
			ipAddress: "203.0.113.42",
			userAgent: "Mozilla/5.0 (Test)",
		});

		const call = auditLogCreateMock.mock.calls[0]?.[0];
		expect(call?.data.ipAddress).toBe("203.0.113.42");
		expect(call?.data.userAgent).toBe("Mozilla/5.0 (Test)");
	});

	it("explicit inputs override request-derived values", async () => {
		const request = new Request("https://example.com", {
			headers: {
				"x-forwarded-for": "10.0.0.1",
				"user-agent": "from-request",
			},
		});

		await auditLog.write({
			action: "MAGIC_LINK_SENT",
			actorEmail: "admin@duohubcontabil.com.br",
			request,
			ipAddress: "203.0.113.42",
			userAgent: "from-input",
		});

		const call = auditLogCreateMock.mock.calls[0]?.[0];
		expect(call?.data.ipAddress).toBe("203.0.113.42");
		expect(call?.data.userAgent).toBe("from-input");
	});

	it("extracts IP and User-Agent from Headers (Server Action path)", async () => {
		const hdrs = new Headers({
			"x-forwarded-for": "203.0.113.77",
			"user-agent": "DuoHub-Tests/3.0",
		});

		await auditLog.write({
			action: "USER_INVITED",
			actorEmail: "admin@duohubcontabil.com.br",
			headers: hdrs,
		});

		const call = auditLogCreateMock.mock.calls[0]?.[0];
		expect(call?.data.ipAddress).toBe("203.0.113.77");
		expect(call?.data.userAgent).toBe("DuoHub-Tests/3.0");
	});
});

describe("auditLog.write — error swallowing", () => {
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		auditLogCreateMock.mockReset();
		errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	it("does not throw when the database call fails", async () => {
		auditLogCreateMock.mockRejectedValueOnce(new Error("connection refused"));

		await expect(
			auditLog.write({
				action: "USER_LOGIN_FAILED",
				actorEmail: "stranger@example.com",
			}),
		).resolves.toBeUndefined();
	});

	it("logs to console.error when DB fails (best-effort visibility)", async () => {
		auditLogCreateMock.mockRejectedValueOnce(new Error("write timeout"));

		await auditLog.write({ action: "USER_LOGOUT" });

		expect(errorSpy).toHaveBeenCalledTimes(1);
		expect(errorSpy.mock.calls[0]?.[0]).toMatch(/audit/);
	});
});
