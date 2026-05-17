"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { messages } from "@/content/messages";
import { ClientType } from "@/generated/prisma/enums";
import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { listMatrizCandidates } from "./queries";
import {
	archiveClientSchema,
	clientSchema,
	searchMatrizCandidatesSchema,
	unarchiveClientSchema,
} from "./schemas";
import type { ClientFormData, ParentClientCandidate } from "./types";
import { cnpjRoot, computeDiff } from "./utils";

export type ActionResult =
	| { success: true }
	| { success: false; error: string };

const labels = messages.admin.clients.errors;

type ParentValidationResult = { ok: true } | { ok: false; error: string };

function isUniqueConstraintError(error: unknown): boolean {
	return (
		error !== null &&
		typeof error === "object" &&
		"code" in error &&
		(error as { code?: unknown }).code === "P2002"
	);
}

function optionalString(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : null;
}

function clientDataFromInput(data: ClientFormData) {
	const isPessoaJuridica = data.type === ClientType.PJ;

	return {
		type: data.type,
		legalName: data.legalName,
		tradeName: data.tradeName ?? null,
		document: data.document,
		taxRegime: isPessoaJuridica ? (data.taxRegime ?? null) : null,
		stateRegistration: isPessoaJuridica
			? (data.stateRegistration ?? null)
			: null,
		cityRegistration: isPessoaJuridica ? (data.cityRegistration ?? null) : null,
		segment: isPessoaJuridica ? (data.segment ?? null) : null,
		primaryEmail: data.primaryEmail,
		primaryPhone: data.primaryPhone,
		contactName: data.contactName,
		zipCode: data.zipCode ?? null,
		street: optionalString(data.street),
		number: optionalString(data.number),
		complement: optionalString(data.complement),
		neighborhood: optionalString(data.neighborhood),
		city: optionalString(data.city),
		state: optionalString(data.state)?.toUpperCase() ?? null,
		additionalContacts: data.additionalContacts,
		parentClientId: isPessoaJuridica ? (data.parentClientId ?? null) : null,
		status: data.status,
		internalNotes: data.internalNotes ?? null,
	};
}

async function validateParentClient(
	data: ClientFormData,
	currentClientId?: string,
): Promise<ParentValidationResult> {
	if (!data.parentClientId) return { ok: true };

	if (data.parentClientId === currentClientId) {
		return { ok: false, error: labels.parentNotMatriz };
	}

	const parent = await db.client.findUnique({
		where: { id: data.parentClientId },
		select: {
			id: true,
			type: true,
			parentClientId: true,
			archivedAt: true,
			document: true,
		},
	});

	if (!parent) return { ok: false, error: labels.parentNotFound };
	if (parent.archivedAt) return { ok: false, error: labels.parentArchived };
	if (parent.type !== ClientType.PJ) {
		return { ok: false, error: labels.parentTypeMismatch };
	}
	if (parent.parentClientId !== null) {
		return { ok: false, error: labels.parentNotMatriz };
	}
	if (cnpjRoot(parent.document) !== cnpjRoot(data.document)) {
		return { ok: false, error: labels.cnpjRootMismatch };
	}

	return { ok: true };
}

type MatrizInvariantSubject = {
	document: string;
	parentClientId: string | null;
};

/**
 * Guards the matriz/filial structural invariants on update:
 *  - a matriz with active branches cannot become a filial (would orphan the
 *    sub-tree);
 *  - a matriz with active branches cannot change its CNPJ root (would split it
 *    from its filiais).
 *
 * Returns `{ ok: true }` when neither rule applies or there are no active
 * branches, so the caller can proceed with the update.
 */
async function validateMatrizInvariants(
	clientId: string,
	before: MatrizInvariantSubject,
	after: ClientFormData,
): Promise<ParentValidationResult> {
	if (before.parentClientId !== null || after.type !== ClientType.PJ) {
		return { ok: true };
	}
	const isBecomingFilial = Boolean(after.parentClientId);
	const isChangingRoot = cnpjRoot(before.document) !== cnpjRoot(after.document);
	if (!isBecomingFilial && !isChangingRoot) return { ok: true };

	const activeBranches = await db.client.count({
		where: { parentClientId: clientId, archivedAt: null },
	});
	if (activeBranches === 0) return { ok: true };

	return {
		ok: false,
		error: isBecomingFilial
			? labels.matrizToFilialWithBranches
			: labels.matrizRootChangeWithBranches,
	};
}

const clientDiffSelect = {
	type: true,
	legalName: true,
	tradeName: true,
	document: true,
	taxRegime: true,
	stateRegistration: true,
	cityRegistration: true,
	segment: true,
	primaryEmail: true,
	primaryPhone: true,
	contactName: true,
	zipCode: true,
	street: true,
	number: true,
	complement: true,
	neighborhood: true,
	city: true,
	state: true,
	additionalContacts: true,
	parentClientId: true,
	status: true,
	internalNotes: true,
} as const;

export async function createClientAction(
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();
	const parsed = clientSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: labels.invalidData };

	const parentValidation = await validateParentClient(parsed.data);
	if (!parentValidation.ok) {
		return { success: false, error: parentValidation.error };
	}

	const reqHeaders = await headers();

	try {
		const created = await db.client.create({
			data: clientDataFromInput(parsed.data),
			select: { id: true, type: true, legalName: true },
		});

		await auditLog.write({
			action: "CLIENT_CREATED",
			actorId: session.user.id,
			actorEmail: session.user.email,
			resourceType: "Client",
			resourceId: created.id,
			metadata: { type: created.type, legalName: created.legalName },
			headers: reqHeaders,
		});

		revalidatePath("/admin/clients");
		return { success: true };
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return { success: false, error: labels.duplicateDocument };
		}
		console.error("[clients] create failed", error);
		return { success: false, error: labels.generic };
	}
}

export async function updateClientAction(
	clientId: string,
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();
	if (!clientId) return { success: false, error: labels.invalidData };

	const parsed = clientSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: labels.invalidData };

	const before = await db.client.findUnique({
		where: { id: clientId },
		select: clientDiffSelect,
	});

	if (!before) return { success: false, error: labels.notFound };

	if (before.type === ClientType.PJ && parsed.data.type === ClientType.PF) {
		const branchCount = await db.client.count({
			where: { parentClientId: clientId, archivedAt: null },
		});
		if (branchCount > 0) {
			return { success: false, error: labels.pjWithBranches };
		}
	}

	const matrizValidation = await validateMatrizInvariants(
		clientId,
		before,
		parsed.data,
	);
	if (!matrizValidation.ok) {
		return { success: false, error: matrizValidation.error };
	}

	const parentValidation = await validateParentClient(parsed.data, clientId);
	if (!parentValidation.ok) {
		return { success: false, error: parentValidation.error };
	}

	const reqHeaders = await headers();

	try {
		// Last-writer-wins on concurrent edits; F1a accepts this trade-off.
		// Bumping `updatedAt` is enough for downstream consumers to detect drift.
		const after = await db.client.update({
			where: { id: clientId },
			data: clientDataFromInput(parsed.data),
			select: clientDiffSelect,
		});

		const { changedFields, metadata } = computeDiff(before, after);
		if (changedFields.length > 0) {
			await auditLog.write({
				action: "CLIENT_UPDATED",
				actorId: session.user.id,
				actorEmail: session.user.email,
				resourceType: "Client",
				resourceId: clientId,
				metadata: {
					changedFields,
					diff: metadata,
					legalName: after.legalName,
				},
				headers: reqHeaders,
			});
		}

		revalidatePath("/admin/clients");
		revalidatePath(`/admin/clients/${clientId}`);
		return { success: true };
	} catch (error) {
		if (isUniqueConstraintError(error)) {
			return { success: false, error: labels.duplicateDocument };
		}
		console.error("[clients] update failed", error);
		return { success: false, error: labels.generic };
	}
}

export async function archiveClientAction(
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();
	const parsed = archiveClientSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: labels.invalidData };

	const reqHeaders = await headers();
	const { clientId } = parsed.data;

	try {
		const archived = await db.$transaction(async (tx) => {
			const target = await tx.client.findUnique({
				where: { id: clientId },
				select: {
					id: true,
					legalName: true,
					archivedAt: true,
					parentClientId: true,
				},
			});

			if (!target) return null;
			if (target.archivedAt) return { target, cascadedBranchIds: [] };

			const branches =
				target.parentClientId === null
					? await tx.client.findMany({
							where: { parentClientId: clientId, archivedAt: null },
							select: { id: true },
						})
					: [];
			const cascadedBranchIds = branches.map((branch) => branch.id);
			const now = new Date();

			await tx.client.update({
				where: { id: clientId },
				data: { archivedAt: now },
			});

			if (cascadedBranchIds.length > 0) {
				await tx.client.updateMany({
					where: { id: { in: cascadedBranchIds }, archivedAt: null },
					data: { archivedAt: now },
				});
			}

			return { target, cascadedBranchIds };
		});

		if (!archived) return { success: false, error: labels.notFound };

		if (!archived.target.archivedAt) {
			await auditLog.write({
				action: "CLIENT_DELETED",
				actorId: session.user.id,
				actorEmail: session.user.email,
				resourceType: "Client",
				resourceId: clientId,
				metadata: {
					legalName: archived.target.legalName,
					cascadedBranchIds: archived.cascadedBranchIds,
				},
				headers: reqHeaders,
			});
		}

		revalidatePath("/admin/clients");
		return { success: true };
	} catch (error) {
		console.error("[clients] archive failed", error);
		return { success: false, error: labels.generic };
	}
}

export async function unarchiveClientAction(
	input: unknown,
): Promise<ActionResult> {
	const session = await requireAdmin();
	const parsed = unarchiveClientSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: labels.invalidData };

	const reqHeaders = await headers();
	const { clientId } = parsed.data;

	try {
		const restored = await db.$transaction(async (tx) => {
			const target = await tx.client.findUnique({
				where: { id: clientId },
				select: {
					id: true,
					legalName: true,
					archivedAt: true,
					parentClientId: true,
				},
			});

			if (!target) return { kind: "notFound" } as const;
			if (!target.archivedAt) return { kind: "alreadyActive" } as const;

			if (target.parentClientId !== null) {
				const parent = await tx.client.findUnique({
					where: { id: target.parentClientId },
					select: { id: true, archivedAt: true },
				});
				if (parent?.archivedAt) {
					return { kind: "parentArchived" } as const;
				}
			}

			// Cascade is timestamp-scoped: archiveClientAction stamps the matriz
			// and all branches it cascade-archives with the SAME `new Date()`.
			// Filiais archived independently (before or after that cascade) carry
			// a different `archivedAt` and must stay archived — otherwise an
			// admin restoring a matriz would silently resurrect filiais that
			// were intentionally closed earlier.
			const cascadeTimestamp = target.archivedAt;
			const branches =
				target.parentClientId === null
					? await tx.client.findMany({
							where: {
								parentClientId: clientId,
								archivedAt: cascadeTimestamp,
							},
							select: { id: true },
						})
					: [];
			const cascadedBranchIds = branches.map((branch) => branch.id);

			await tx.client.update({
				where: { id: clientId },
				data: { archivedAt: null },
			});

			if (cascadedBranchIds.length > 0) {
				await tx.client.updateMany({
					where: {
						id: { in: cascadedBranchIds },
						archivedAt: cascadeTimestamp,
					},
					data: { archivedAt: null },
				});
			}

			return { kind: "ok", target, cascadedBranchIds } as const;
		});

		if (restored.kind === "notFound") {
			return { success: false, error: labels.notFound };
		}
		if (restored.kind === "parentArchived") {
			return { success: false, error: labels.parentStillArchived };
		}
		if (restored.kind === "alreadyActive") {
			return { success: true };
		}

		await auditLog.write({
			action: "CLIENT_RESTORED",
			actorId: session.user.id,
			actorEmail: session.user.email,
			resourceType: "Client",
			resourceId: clientId,
			metadata: {
				legalName: restored.target.legalName,
				cascadedBranchIds: restored.cascadedBranchIds,
			},
			headers: reqHeaders,
		});

		revalidatePath("/admin/clients");
		revalidatePath(`/admin/clients/${clientId}`);
		return { success: true };
	} catch (error) {
		console.error("[clients] unarchive failed", error);
		return { success: false, error: labels.generic };
	}
}

export async function searchMatrizCandidatesAction(
	input: unknown,
): Promise<ParentClientCandidate[]> {
	await requireAdmin();
	const parsed = searchMatrizCandidatesSchema.safeParse(input);
	if (!parsed.success) return [];
	return listMatrizCandidates(parsed.data);
}
