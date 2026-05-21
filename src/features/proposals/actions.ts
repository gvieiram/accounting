"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";

import { normalizeDocument } from "./normalize-document";
import {
	createProposalDraftSchema,
	saveProposalSectionSchema,
} from "./schemas";

export type ActionResult<T = void> =
	| ({ success: true } & (T extends void ? object : { data: T }))
	| { success: false; error: string };

export async function createProposalDraft(
	input: z.infer<typeof createProposalDraftSchema>,
): Promise<ActionResult<{ proposalId: string }>> {
	const session = await requireAdmin();
	const parsed = createProposalDraftSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const template = await db.proposalTemplate.findUnique({
		where: { key: parsed.data.templateKey },
		include: { currentVersion: true },
	});

	if (!template?.isActive || !template.currentVersion) {
		return { success: false, error: "Template não disponível" };
	}

	const prospectData = parsed.data.prospectData
		? {
				...parsed.data.prospectData,
				document: normalizeDocument(parsed.data.prospectData.document),
			}
		: null;

	const proposal = await db.proposal.create({
		data: {
			templateId: template.id,
			templateVersionId: template.currentVersion.id,
			clientId: parsed.data.clientId ?? null,
			prospectData: prospectData as Prisma.InputJsonValue,
			editableContent: (template.currentVersion.defaultContent ??
				{}) as Prisma.InputJsonValue,
			status: "DRAFT",
			currency: "BRL",
			createdById: session.user.id,
		},
	});

	await auditLog.write({
		action: "PROPOSAL_CREATED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Proposal",
		resourceId: proposal.id,
		headers: await headers(),
	});

	revalidatePath("/admin/proposals");

	return { success: true, data: { proposalId: proposal.id } };
}

export async function saveProposalSection(
	input: z.infer<typeof saveProposalSectionSchema>,
): Promise<ActionResult> {
	await requireAdmin();
	const parsed = saveProposalSectionSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const proposal = await db.proposal.findUnique({
		where: { id: parsed.data.proposalId },
		select: { id: true, status: true, editableContent: true },
	});
	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (proposal.status !== "DRAFT")
		return { success: false, error: "Apenas rascunhos podem ser editados" };

	const current = (proposal.editableContent as Record<string, unknown>) ?? {};
	await db.proposal.update({
		where: { id: parsed.data.proposalId },
		data: {
			editableContent: {
				...current,
				[parsed.data.sectionKey]: parsed.data.sectionData,
			} as Prisma.InputJsonValue,
		},
	});
	return { success: true };
}
