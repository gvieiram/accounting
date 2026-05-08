// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const userFindManyMock = vi.fn();
const invitationFindManyMock = vi.fn();

vi.mock("@/lib/db", () => ({
	db: {
		user: { findMany: userFindManyMock },
		invitation: { findMany: invitationFindManyMock },
	},
}));

const { listUsers } = await import("./queries");

describe("listUsers — query shape", () => {
	beforeEach(() => {
		userFindManyMock.mockReset();
		userFindManyMock.mockResolvedValue([]);
		invitationFindManyMock.mockReset();
		invitationFindManyMock.mockResolvedValue([]);
	});

	it("queries admins and pending invitations in parallel", async () => {
		await listUsers();

		expect(userFindManyMock).toHaveBeenCalledWith({
			where: { role: "ADMIN" },
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				revokedAt: true,
				sessions: {
					select: { createdAt: true },
					orderBy: { createdAt: "desc" },
					take: 1,
				},
			},
		});
		expect(invitationFindManyMock).toHaveBeenCalledWith({
			where: { acceptedAt: null, revokedAt: null },
			select: {
				id: true,
				email: true,
				name: true,
				createdAt: true,
				expiresAt: true,
			},
		});
	});
});

describe("listUsers — mapping", () => {
	beforeEach(() => {
		userFindManyMock.mockReset();
		userFindManyMock.mockResolvedValue([]);
		invitationFindManyMock.mockReset();
		invitationFindManyMock.mockResolvedValue([]);
	});

	it("maps sessions[0].createdAt to lastAccessAt and ACTIVE status", async () => {
		const sessionDate = new Date("2026-04-01T10:00:00Z");
		userFindManyMock.mockResolvedValue([
			{
				id: "user-1",
				email: "admin@duohub.com",
				name: "Admin",
				createdAt: new Date("2026-01-01T00:00:00Z"),
				revokedAt: null,
				sessions: [{ createdAt: sessionDate }],
			},
		]);

		const result = await listUsers();

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			id: "user-1",
			kind: "user",
			email: "admin@duohub.com",
			name: "Admin",
			createdAt: new Date("2026-01-01T00:00:00Z"),
			status: "ACTIVE",
			lastAccessAt: sessionDate,
			expiresAt: null,
			inviteExpired: false,
		});
	});

	it("maps revoked users to REVOKED with lastAccessAt null when no sessions", async () => {
		userFindManyMock.mockResolvedValue([
			{
				id: "user-2",
				email: "rev@duohub.com",
				name: null,
				createdAt: new Date("2026-02-01T00:00:00Z"),
				revokedAt: new Date("2026-03-01T00:00:00Z"),
				sessions: [],
			},
		]);

		const result = await listUsers();

		expect(result[0]).toMatchObject({
			id: "user-2",
			kind: "user",
			status: "REVOKED",
			lastAccessAt: null,
		});
	});

	it("maps invitations to INVITED with kind=invitation and expiresAt", async () => {
		const future = new Date(Date.now() + 60 * 60 * 1000);
		invitationFindManyMock.mockResolvedValue([
			{
				id: "inv-1",
				email: "pending@x.com",
				name: null,
				createdAt: new Date("2026-04-10T00:00:00Z"),
				expiresAt: future,
			},
		]);

		const result = await listUsers();

		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({
			id: "inv-1",
			kind: "invitation",
			email: "pending@x.com",
			status: "INVITED",
			lastAccessAt: null,
			inviteExpired: false,
		});
		expect(result[0].expiresAt?.getTime()).toBe(future.getTime());
	});

	it("flags expired invitations with inviteExpired=true", async () => {
		const past = new Date(Date.now() - 60 * 60 * 1000);
		invitationFindManyMock.mockResolvedValue([
			{
				id: "inv-2",
				email: "stale@x.com",
				name: null,
				createdAt: new Date("2026-03-01T00:00:00Z"),
				expiresAt: past,
			},
		]);

		const result = await listUsers();

		expect(result[0]).toMatchObject({
			status: "INVITED",
			inviteExpired: true,
		});
	});

	it("orders results: active → pending invite → expired invite → revoked", async () => {
		const future = new Date(Date.now() + 60 * 60 * 1000);
		const past = new Date(Date.now() - 60 * 60 * 1000);

		userFindManyMock.mockResolvedValue([
			{
				id: "u-rev",
				email: "rev@x.com",
				name: null,
				createdAt: new Date("2026-02-01"),
				revokedAt: new Date("2026-03-01"),
				sessions: [],
			},
			{
				id: "u-act",
				email: "act@x.com",
				name: null,
				createdAt: new Date("2026-01-01"),
				revokedAt: null,
				sessions: [],
			},
		]);
		invitationFindManyMock.mockResolvedValue([
			{
				id: "inv-stale",
				email: "stale@x.com",
				name: null,
				createdAt: new Date("2026-04-01"),
				expiresAt: past,
			},
			{
				id: "inv-fresh",
				email: "fresh@x.com",
				name: null,
				createdAt: new Date("2026-04-15"),
				expiresAt: future,
			},
		]);

		const result = await listUsers();

		expect(result.map((r) => r.id)).toEqual([
			"u-act",
			"inv-fresh",
			"inv-stale",
			"u-rev",
		]);
	});
});
