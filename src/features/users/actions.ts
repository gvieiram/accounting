"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { sendInviteEmail } from "@/features/auth/emails/dispatch";
import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import {
	generateInvitationToken,
	hashInvitationToken,
	invitationExpiresAt,
} from "@/lib/auth/invitation-token";
import { db } from "@/lib/db";
import { inviteAcceptRateLimitByIp } from "@/lib/ratelimit";
import { getSiteUrl } from "@/lib/site-url";
import {
	acceptInvitationSchema,
	invitationIdSchema,
	inviteUserSchema,
	reactivateUserSchema,
	revokeUserSchema,
} from "./schemas";

export type ActionResult =
	| { success: true }
	| { success: false; error: string };

function buildAcceptUrl(rawToken: string): string {
	const url = new URL("/invite/accept", getSiteUrl());
	url.searchParams.set("token", rawToken);
	return url.toString();
}

/**
 * Invite a new admin by email.
 *
 * Creates a pending `Invitation` (no `User` row yet — that's the security
 * fix: a typo'd email cannot create an admin without explicit acceptance)
 * and sends an invite email with a 24h-expiring token. The recipient must
 * click the link and confirm before any User is provisioned.
 */
export async function inviteUserAction(input: unknown): Promise<ActionResult> {
	const session = await requireAdmin();

	const parsed = inviteUserSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos." };

	const { email, name } = parsed.data;

	const existingUser = await db.user.findUnique({
		where: { email },
		select: { id: true, revokedAt: true },
	});
	if (existingUser && !existingUser.revokedAt) {
		return {
			success: false,
			error: "Já existe um administrador com este e-mail.",
		};
	}
	if (existingUser?.revokedAt) {
		return {
			success: false,
			error:
				'Este e-mail pertence a um usuário revogado. Use "Reativar acesso" na linha correspondente.',
		};
	}

	const existingPending = await db.invitation.findFirst({
		where: { email, acceptedAt: null, revokedAt: null },
		select: { id: true },
	});
	if (existingPending) {
		return {
			success: false,
			error:
				'Já existe um convite pendente para este e-mail. Use "Reenviar convite".',
		};
	}

	const { raw, hash } = generateInvitationToken();
	const created = await db.invitation.create({
		data: {
			email,
			name: name ?? null,
			role: "ADMIN",
			tokenHash: hash,
			expiresAt: invitationExpiresAt(),
			invitedById: session.user.id,
		},
	});

	const reqHeaders = await headers();

	await auditLog.write({
		action: "USER_INVITED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Invitation",
		resourceId: created.id,
		metadata: { email: created.email },
		headers: reqHeaders,
	});

	try {
		await sendInviteEmail({
			to: email,
			acceptUrl: buildAcceptUrl(raw),
			recipientName: name ?? null,
			inviterName: session.user.name ?? null,
		});
	} catch (e) {
		console.error("Invite email failed", e);
	}

	revalidatePath("/admin/users");
	return { success: true };
}

/**
 * Resend a pending invitation: rotate the token, extend expiresAt, send a
 * fresh email. If the invitation has already been accepted or cancelled,
 * we refuse — caller should issue a new invite instead.
 */
export async function resendInvitationAction(
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();

	const parsed = invitationIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos." };

	const invitation = await db.invitation.findUnique({
		where: { id: parsed.data.invitationId },
		select: {
			id: true,
			email: true,
			name: true,
			acceptedAt: true,
			revokedAt: true,
		},
	});
	if (!invitation) {
		return { success: false, error: "Convite não encontrado." };
	}
	if (invitation.acceptedAt) {
		return { success: false, error: "Este convite já foi aceito." };
	}
	if (invitation.revokedAt) {
		return {
			success: false,
			error: "Este convite foi cancelado. Envie um novo convite.",
		};
	}

	const { raw, hash } = generateInvitationToken();
	const updated = await db.invitation.update({
		where: { id: invitation.id },
		data: { tokenHash: hash, expiresAt: invitationExpiresAt() },
		select: { id: true, email: true, name: true },
	});

	const reqHeaders = await headers();

	await auditLog.write({
		action: "USER_INVITE_RESENT",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Invitation",
		resourceId: updated.id,
		metadata: { email: updated.email },
		headers: reqHeaders,
	});

	try {
		await sendInviteEmail({
			to: updated.email,
			acceptUrl: buildAcceptUrl(raw),
			recipientName: updated.name,
			inviterName: session.user.name ?? null,
		});
	} catch (e) {
		console.error("Invite email failed", e);
	}

	revalidatePath("/admin/users");
	return { success: true };
}

/**
 * Cancel a pending invitation. Soft-delete via `revokedAt` so we keep the
 * audit trail and can detect re-invite attempts.
 */
export async function cancelInvitationAction(
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();

	const parsed = invitationIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos." };

	const invitation = await db.invitation.findUnique({
		where: { id: parsed.data.invitationId },
		select: {
			id: true,
			email: true,
			acceptedAt: true,
			revokedAt: true,
		},
	});
	if (!invitation) {
		return { success: false, error: "Convite não encontrado." };
	}
	if (invitation.acceptedAt) {
		return { success: false, error: "Este convite já foi aceito." };
	}
	if (invitation.revokedAt) {
		return { success: false, error: "Este convite já foi cancelado." };
	}

	await db.invitation.update({
		where: { id: invitation.id },
		data: { revokedAt: new Date() },
	});

	const reqHeaders = await headers();

	await auditLog.write({
		action: "USER_INVITE_CANCELLED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Invitation",
		resourceId: invitation.id,
		metadata: { email: invitation.email },
		headers: reqHeaders,
	});

	revalidatePath("/admin/users");
	return { success: true };
}

/**
 * Accept a pending invitation. Public action invoked by the
 * `/invite/accept` page. Validates the raw token, provisions the User
 * row, and marks the invitation accepted in a single transaction. Does
 * NOT create a session — the user is redirected to `/login` afterwards
 * so that any auth method (magic link today, password/2FA in the future)
 * is honoured uniformly.
 */
export async function acceptInvitationAction(
	input: unknown,
): Promise<ActionResult> {
	const parsed = acceptInvitationSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Token inválido." };

	const reqHeaders = await headers();
	const ipAddress =
		reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		reqHeaders.get("x-real-ip")?.trim() ??
		null;
	const limit = await inviteAcceptRateLimitByIp.limit(ipAddress ?? "unknown");
	if (!limit.success) {
		return {
			success: false,
			error: "Muitas tentativas. Tente novamente em alguns minutos.",
		};
	}

	const tokenHash = hashInvitationToken(parsed.data.token);

	const invitation = await db.invitation.findUnique({
		where: { tokenHash },
		select: {
			id: true,
			email: true,
			name: true,
			role: true,
			expiresAt: true,
			acceptedAt: true,
			revokedAt: true,
		},
	});

	if (!invitation || invitation.revokedAt) {
		return { success: false, error: "Convite inválido." };
	}
	if (invitation.acceptedAt) {
		return { success: false, error: "Este convite já foi aceito." };
	}
	if (invitation.expiresAt < new Date()) {
		return { success: false, error: "Convite expirado." };
	}

	// Race-safe path: the email is unique on User, so a concurrent invite
	// from a different token would surface as a P2002 here. We accept the
	// first writer and surface a friendly error to the loser.
	try {
		const accepted = await db.$transaction(async (tx) => {
			const user = await tx.user.create({
				data: {
					email: invitation.email,
					name: invitation.name,
					role: invitation.role,
					emailVerified: true,
				},
				select: { id: true, email: true },
			});
			const inv = await tx.invitation.update({
				where: { id: invitation.id },
				data: { acceptedAt: new Date() },
			});
			return { user, invitationId: inv.id };
		});

		await auditLog.write({
			action: "USER_INVITE_ACCEPTED",
			actorId: accepted.user.id,
			actorEmail: accepted.user.email,
			resourceType: "Invitation",
			resourceId: accepted.invitationId,
			metadata: { email: accepted.user.email },
			headers: reqHeaders,
		});
	} catch (e) {
		const code = (e as { code?: string }).code;
		if (code === "P2002") {
			return {
				success: false,
				error: "Já existe uma conta com este e-mail.",
			};
		}
		throw e;
	}

	revalidatePath("/admin/users");
	return { success: true };
}

/**
 * Reactivate a previously revoked admin: clears `revokedAt`. This is NOT
 * a re-invite — it restores an identity that already accepted once. The
 * user can sign in via the standard `/login` flow afterwards.
 */
export async function reactivateUserAction(
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();

	const parsed = reactivateUserSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos." };

	const target = await db.user.findUnique({
		where: { id: parsed.data.userId },
		select: { id: true, email: true, revokedAt: true },
	});
	if (!target) return { success: false, error: "Usuário não encontrado." };
	if (!target.revokedAt) {
		return { success: false, error: "Este usuário já está ativo." };
	}

	await db.user.update({
		where: { id: target.id },
		data: { revokedAt: null },
	});

	const reqHeaders = await headers();

	await auditLog.write({
		action: "USER_REACTIVATED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "User",
		resourceId: target.id,
		metadata: { email: target.email },
		headers: reqHeaders,
	});

	revalidatePath("/admin/users");
	return { success: true };
}

/**
 * Revoke an admin user's access.
 *
 * Sets `revokedAt` on the user row and deletes all their active sessions in a
 * single transaction so the revocation takes effect immediately. Writes a
 * `USER_REVOKED` audit row including the target's email for incident
 * traceability. The email lookup is best-effort — we still revoke if it returns
 * null (e.g. user deleted by a concurrent operation).
 */
export async function revokeUserAction(input: unknown): Promise<ActionResult> {
	const session = await requireAdmin();

	const parsed = revokeUserSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos." };

	const { userId } = parsed.data;

	if (userId === session.user.id) {
		return {
			success: false,
			error: "Você não pode revogar seu próprio acesso.",
		};
	}

	const target = await db.user.findUnique({
		where: { id: userId },
		select: { email: true, revokedAt: true },
	});
	if (target?.revokedAt) {
		return { success: false, error: "Este usuário já está revogado." };
	}

	await db.$transaction([
		db.user.update({
			where: { id: userId },
			data: { revokedAt: new Date() },
		}),
		db.session.deleteMany({ where: { userId } }),
	]);

	const reqHeaders = await headers();

	await auditLog.write({
		action: "USER_REVOKED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "User",
		resourceId: userId,
		metadata: { email: target?.email ?? null },
		headers: reqHeaders,
	});

	revalidatePath("/admin/users");
	return { success: true };
}
