// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const sendInviteEmailMock = vi.fn();
const auditWriteMock = vi.fn();

const userFindUniqueMock = vi.fn();
const userCreateMock = vi.fn();
const userUpdateMock = vi.fn();

const invitationFindUniqueMock = vi.fn();
const invitationFindFirstMock = vi.fn();
const invitationCreateMock = vi.fn();
const invitationUpdateMock = vi.fn();

const sessionDeleteManyMock = vi.fn();
const transactionMock = vi.fn();

const revalidatePathMock = vi.fn();
const inviteAcceptLimitMock = vi.fn();

let mockHeaders = new Headers();

vi.mock("@/lib/auth/helpers", () => ({
	requireAdmin: requireAdminMock,
}));

vi.mock("@/features/auth/emails/dispatch", () => ({
	sendInviteEmail: sendInviteEmailMock,
}));

vi.mock("@/lib/audit/log", () => ({
	auditLog: { write: auditWriteMock },
}));

vi.mock("@/lib/db", () => ({
	db: {
		user: {
			findUnique: userFindUniqueMock,
			create: userCreateMock,
			update: userUpdateMock,
		},
		invitation: {
			findUnique: invitationFindUniqueMock,
			findFirst: invitationFindFirstMock,
			create: invitationCreateMock,
			update: invitationUpdateMock,
		},
		session: { deleteMany: sessionDeleteManyMock },
		$transaction: transactionMock,
	},
}));

vi.mock("@/lib/site-url", () => ({
	getSiteUrl: () => "https://example.test",
}));

vi.mock("@/lib/ratelimit", () => ({
	inviteAcceptRateLimitByIp: { limit: inviteAcceptLimitMock },
}));

vi.mock("next/cache", () => ({
	revalidatePath: revalidatePathMock,
}));

vi.mock("next/headers", () => ({
	headers: async () => mockHeaders,
}));

const {
	inviteUserAction,
	resendInvitationAction,
	cancelInvitationAction,
	acceptInvitationAction,
	reactivateUserAction,
	revokeUserAction,
} = await import("./actions");

const SESSION = {
	user: { id: "admin_1", email: "admin@x.com", name: "Admin User" },
};

beforeEach(() => {
	requireAdminMock.mockReset();
	requireAdminMock.mockResolvedValue(SESSION);
	sendInviteEmailMock.mockReset();
	sendInviteEmailMock.mockResolvedValue(undefined);
	auditWriteMock.mockReset();
	auditWriteMock.mockResolvedValue(undefined);
	userFindUniqueMock.mockReset();
	userFindUniqueMock.mockResolvedValue(null);
	userCreateMock.mockReset();
	userUpdateMock.mockReset();
	invitationFindUniqueMock.mockReset();
	invitationFindFirstMock.mockReset();
	invitationFindFirstMock.mockResolvedValue(null);
	invitationCreateMock.mockReset();
	invitationUpdateMock.mockReset();
	sessionDeleteManyMock.mockReset();
	transactionMock.mockReset();
	revalidatePathMock.mockReset();
	inviteAcceptLimitMock.mockReset();
	inviteAcceptLimitMock.mockResolvedValue({ success: true });
	mockHeaders = new Headers();
});

describe("inviteUserAction", () => {
	beforeEach(() => {
		invitationCreateMock.mockResolvedValue({
			id: "inv_1",
			email: "newadmin@x.com",
		});
	});

	it("creates Invitation (not User), audits, sends invite email", async () => {
		const r = await inviteUserAction({
			email: "newadmin@x.com",
			name: "New Admin",
		});

		expect(r).toEqual({ success: true });
		expect(userCreateMock).not.toHaveBeenCalled();
		expect(invitationCreateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					email: "newadmin@x.com",
					name: "New Admin",
					role: "ADMIN",
					invitedById: "admin_1",
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "USER_INVITED",
				resourceType: "Invitation",
				resourceId: "inv_1",
				metadata: { email: "newadmin@x.com" },
			}),
		);
		expect(sendInviteEmailMock).toHaveBeenCalledWith(
			expect.objectContaining({
				to: "newadmin@x.com",
				acceptUrl: expect.stringMatching(
					/^https:\/\/example\.test\/invite\/accept\?token=[\w-]+$/,
				),
				inviterName: "Admin User",
			}),
		);
		expect(revalidatePathMock).toHaveBeenCalledWith("/admin/users");
	});

	it("active duplicate user: refuses with friendly error", async () => {
		userFindUniqueMock.mockResolvedValue({ id: "u1", revokedAt: null });

		const r = await inviteUserAction({ email: "exists@x.com" });

		expect(r).toEqual({
			success: false,
			error: "Já existe um administrador com este e-mail.",
		});
		expect(invitationCreateMock).not.toHaveBeenCalled();
		expect(sendInviteEmailMock).not.toHaveBeenCalled();
	});

	it("revoked user: instructs to use reactivate, no invitation created", async () => {
		userFindUniqueMock.mockResolvedValue({
			id: "u1",
			revokedAt: new Date(),
		});

		const r = await inviteUserAction({ email: "rev@x.com" });

		expect(r.success).toBe(false);
		expect(r).toMatchObject({
			error: expect.stringContaining("Reativar acesso"),
		});
		expect(invitationCreateMock).not.toHaveBeenCalled();
	});

	it("pending invitation already exists: returns guidance, no duplicate", async () => {
		invitationFindFirstMock.mockResolvedValue({ id: "inv_old" });

		const r = await inviteUserAction({ email: "pending@x.com" });

		expect(r.success).toBe(false);
		expect(r).toMatchObject({
			error: expect.stringContaining("Reenviar convite"),
		});
		expect(invitationCreateMock).not.toHaveBeenCalled();
	});

	it("invalid input: empty email returns dados inválidos", async () => {
		const r = await inviteUserAction({ email: "" });

		expect(r).toEqual({ success: false, error: "Dados inválidos." });
	});

	it("email send failure: invitation still committed, success returned", async () => {
		sendInviteEmailMock.mockRejectedValueOnce(new Error("SMTP down"));
		const consoleSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		const r = await inviteUserAction({ email: "newadmin@x.com" });

		expect(r).toEqual({ success: true });
		expect(invitationCreateMock).toHaveBeenCalled();
		expect(auditWriteMock).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});

describe("resendInvitationAction", () => {
	it("rotates token, resends email, audits USER_INVITE_RESENT", async () => {
		invitationFindUniqueMock.mockResolvedValue({
			id: "inv_1",
			email: "x@x.com",
			name: null,
			acceptedAt: null,
			revokedAt: null,
		});
		invitationUpdateMock.mockResolvedValue({
			id: "inv_1",
			email: "x@x.com",
			name: null,
		});

		const r = await resendInvitationAction({ invitationId: "inv_1" });

		expect(r).toEqual({ success: true });
		expect(invitationUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "inv_1" },
				data: expect.objectContaining({
					tokenHash: expect.any(String),
					expiresAt: expect.any(Date),
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({ action: "USER_INVITE_RESENT" }),
		);
		expect(sendInviteEmailMock).toHaveBeenCalled();
	});

	it("rejects accepted invitation", async () => {
		invitationFindUniqueMock.mockResolvedValue({
			id: "inv_1",
			email: "x@x.com",
			name: null,
			acceptedAt: new Date(),
			revokedAt: null,
		});

		const r = await resendInvitationAction({ invitationId: "inv_1" });

		expect(r).toEqual({
			success: false,
			error: "Este convite já foi aceito.",
		});
		expect(invitationUpdateMock).not.toHaveBeenCalled();
	});

	it("rejects cancelled invitation", async () => {
		invitationFindUniqueMock.mockResolvedValue({
			id: "inv_1",
			email: "x@x.com",
			name: null,
			acceptedAt: null,
			revokedAt: new Date(),
		});

		const r = await resendInvitationAction({ invitationId: "inv_1" });

		expect(r.success).toBe(false);
	});

	it("returns error when invitation not found", async () => {
		invitationFindUniqueMock.mockResolvedValue(null);

		const r = await resendInvitationAction({ invitationId: "missing" });

		expect(r).toEqual({
			success: false,
			error: "Convite não encontrado.",
		});
	});
});

describe("cancelInvitationAction", () => {
	it("soft-deletes invitation and audits USER_INVITE_CANCELLED", async () => {
		invitationFindUniqueMock.mockResolvedValue({
			id: "inv_1",
			email: "x@x.com",
			acceptedAt: null,
			revokedAt: null,
		});
		invitationUpdateMock.mockResolvedValue({});

		const r = await cancelInvitationAction({ invitationId: "inv_1" });

		expect(r).toEqual({ success: true });
		expect(invitationUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { revokedAt: expect.any(Date) },
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({ action: "USER_INVITE_CANCELLED" }),
		);
	});
});

describe("acceptInvitationAction", () => {
	it("hash mismatch returns invalid", async () => {
		invitationFindUniqueMock.mockResolvedValue(null);

		const r = await acceptInvitationAction({ token: "bad-token" });

		expect(r).toEqual({ success: false, error: "Convite inválido." });
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("expired invitation returns expirado without creating user", async () => {
		invitationFindUniqueMock.mockResolvedValue({
			id: "inv_1",
			email: "x@x.com",
			name: null,
			role: "ADMIN",
			expiresAt: new Date(Date.now() - 1000),
			acceptedAt: null,
			revokedAt: null,
		});

		const r = await acceptInvitationAction({ token: "any" });

		expect(r).toEqual({ success: false, error: "Convite expirado." });
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("happy path: creates User in tx, marks accepted, audits", async () => {
		invitationFindUniqueMock.mockResolvedValue({
			id: "inv_1",
			email: "new@x.com",
			name: "New",
			role: "ADMIN",
			expiresAt: new Date(Date.now() + 60 * 1000),
			acceptedAt: null,
			revokedAt: null,
		});
		transactionMock.mockImplementation(async (fn) => {
			const tx = {
				user: {
					create: vi.fn().mockResolvedValue({
						id: "user_new",
						email: "new@x.com",
					}),
				},
				invitation: {
					update: vi.fn().mockResolvedValue({ id: "inv_1" }),
				},
			};
			return fn(tx);
		});

		const r = await acceptInvitationAction({ token: "valid-token" });

		expect(r).toEqual({ success: true });
		expect(transactionMock).toHaveBeenCalledOnce();
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "USER_INVITE_ACCEPTED",
				actorId: "user_new",
				resourceId: "inv_1",
			}),
		);
	});

	it("rate limited: returns friendly error", async () => {
		inviteAcceptLimitMock.mockResolvedValueOnce({ success: false });

		const r = await acceptInvitationAction({ token: "any" });

		expect(r.success).toBe(false);
		expect(r).toMatchObject({
			error: expect.stringContaining("Muitas tentativas"),
		});
		expect(invitationFindUniqueMock).not.toHaveBeenCalled();
	});
});

describe("reactivateUserAction", () => {
	it("clears revokedAt and audits USER_REACTIVATED", async () => {
		userFindUniqueMock.mockResolvedValue({
			id: "u1",
			email: "x@x.com",
			revokedAt: new Date(),
		});

		const r = await reactivateUserAction({ userId: "u1" });

		expect(r).toEqual({ success: true });
		expect(userUpdateMock).toHaveBeenCalledWith({
			where: { id: "u1" },
			data: { revokedAt: null },
		});
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({ action: "USER_REACTIVATED" }),
		);
	});

	it("rejects already-active user", async () => {
		userFindUniqueMock.mockResolvedValue({
			id: "u1",
			email: "x@x.com",
			revokedAt: null,
		});

		const r = await reactivateUserAction({ userId: "u1" });

		expect(r.success).toBe(false);
		expect(userUpdateMock).not.toHaveBeenCalled();
	});
});

describe("revokeUserAction", () => {
	beforeEach(() => {
		userFindUniqueMock.mockResolvedValue({
			email: "target@x.com",
			revokedAt: null,
		});
		transactionMock.mockResolvedValue([{}, {}]);
	});

	it("happy path: runs transaction, audits with target email", async () => {
		const r = await revokeUserAction({ userId: "user_target" });

		expect(r).toEqual({ success: true });
		expect(transactionMock).toHaveBeenCalledOnce();
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "USER_REVOKED",
				resourceId: "user_target",
				metadata: { email: "target@x.com" },
			}),
		);
	});

	it("self-revoke: refuses without transaction", async () => {
		const r = await revokeUserAction({ userId: "admin_1" });

		expect(r).toEqual({
			success: false,
			error: "Você não pode revogar seu próprio acesso.",
		});
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("already revoked: refuses without transaction", async () => {
		userFindUniqueMock.mockResolvedValue({
			email: "x@x.com",
			revokedAt: new Date(),
		});

		const r = await revokeUserAction({ userId: "u1" });

		expect(r.success).toBe(false);
		expect(transactionMock).not.toHaveBeenCalled();
	});

	it("invalid input: empty userId", async () => {
		const r = await revokeUserAction({ userId: "" });

		expect(r).toEqual({ success: false, error: "Dados inválidos." });
	});
});
