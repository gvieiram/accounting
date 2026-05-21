"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import type { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ProposalStatus } from "@/generated/prisma/enums";
import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";

import { normalizeDocument } from "./normalize-document";
import { renderTemplate } from "./render";
import { buildRenderData } from "./render-proposal";
import {
	cancelProposalSchema,
	createProposalDraftSchema,
	proposalIdSchema,
	publishProposalCommercialSchema,
	saveProposalSectionSchema,
} from "./schemas";
import { templateRegistry } from "./templates";
import { generateToken, hashToken } from "./token";
import { toEndOfSaoPauloDay } from "./tz";

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

type ProspectShape = {
	type: "PF" | "PJ";
	document: string;
	name?: string;
	legalName?: string;
	taxRegime?: string;
	email?: string;
	phone?: string;
	segment?: string;
	contactName?: string;
};

type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function resolveClientId(
	tx: TxClient,
	proposal: { clientId: string | null; prospectData: unknown },
): Promise<string | null> {
	if (proposal.clientId) return proposal.clientId;
	if (!proposal.prospectData) return null;
	return resolveClientFromProspect(tx, proposal.prospectData as ProspectShape);
}

async function resolveClientFromProspect(
	tx: TxClient,
	prospect: ProspectShape,
): Promise<string> {
	const normalized = normalizeDocument(prospect.document);
	const existing = await tx.client.findUnique({
		where: { document: normalized },
	});
	if (existing) return existing.id;

	const created = await tx.client.create({
		data: {
			type: prospect.type,
			legalName: prospect.legalName ?? prospect.name ?? "Sem nome",
			document: normalized,
			primaryEmail: prospect.email ?? "",
			primaryPhone: prospect.phone ?? "",
			contactName: prospect.contactName ?? prospect.name ?? "",
			taxRegime: prospect.type === "PJ" ? (prospect.taxRegime as never) : null,
			segment: prospect.type === "PJ" ? prospect.segment : null,
			status: "PROSPECT",
		},
	});
	return created.id;
}

export async function publishProposal(input: {
	proposalId: string;
	commercial: z.infer<typeof publishProposalCommercialSchema>;
}): Promise<
	ActionResult<{ versionId: string; version: number; publicUrl: string | null }>
> {
	const session = await requireAdmin();
	const idCheck = proposalIdSchema.safeParse({ proposalId: input.proposalId });
	if (!idCheck.success) return { success: false, error: "Dados inválidos" };
	const commercialCheck = publishProposalCommercialSchema.safeParse(
		input.commercial,
	);
	if (!commercialCheck.success) {
		return { success: false, error: "Campos comerciais inválidos" };
	}
	const normalizedExpiresAt = toEndOfSaoPauloDay(
		commercialCheck.data.expiresAt,
	);

	const proposal = await db.proposal.findUnique({
		where: { id: idCheck.data.proposalId },
		include: {
			template: { include: { currentVersion: true } },
			templateVersion: true,
			client: true,
		},
	});

	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (proposal.status !== "DRAFT")
		return { success: false, error: "Apenas rascunhos podem ser publicados" };

	if (commercialCheck.data.category !== proposal.template.category) {
		return {
			success: false,
			error: "Categoria comercial incompatível com o template",
		};
	}

	const registered = templateRegistry[proposal.template.key];
	if (!registered)
		return { success: false, error: "Template não registrado em código" };

	const contentCheck = registered.schema.safeParse(proposal.editableContent);
	if (!contentCheck.success)
		return { success: false, error: "Conteúdo incompleto" };

	const mainAmount = commercialCheck.data.mainAmount ?? null;
	const recurringAmount = commercialCheck.data.recurringAmount ?? null;
	const currency = commercialCheck.data.currency;

	const result = await db.$transaction(async (tx) => {
		const clientId = await resolveClientId(tx, proposal);

		const clientRecord = clientId
			? await tx.client.findUnique({ where: { id: clientId } })
			: null;

		const data = buildRenderData({
			client: clientRecord,
			prospectData: clientRecord ? null : (proposal.prospectData as never),
			editableContent: contentCheck.data as Record<string, unknown>,
			mainAmount,
			recurringAmount,
			currency,
			commercialData:
				(proposal.commercialData as Record<string, unknown>) ?? {},
			expiresAt: normalizedExpiresAt,
		});

		const html = renderTemplate(
			registered.html,
			data as unknown as Record<string, unknown>,
			registered.metadata,
		);

		const count = await tx.proposalPublishedVersion.count({
			where: { proposalId: proposal.id },
		});
		const version = count + 1;

		const published = await tx.proposalPublishedVersion.create({
			data: {
				proposalId: proposal.id,
				version,
				templateKey: proposal.template.key,
				templateVersion: proposal.templateVersion.version,
				snapshot: {
					editableContent: contentCheck.data,
					commercialData: proposal.commercialData,
					mainAmount,
					recurringAmount,
					currency,
					client: clientRecord,
					expiresAt: normalizedExpiresAt,
				} as Prisma.InputJsonValue,
				renderedHtml: html,
				publishedById: session.user.id,
			},
		});

		const newToken = proposal.publicTokenHash ? null : generateToken();
		const tokenHash = newToken ? hashToken(newToken) : proposal.publicTokenHash;

		await tx.proposal.update({
			where: { id: proposal.id },
			data: {
				status: "PUBLISHED",
				clientId,
				prospectData: clientId
					? Prisma.JsonNull
					: (proposal.prospectData as Prisma.InputJsonValue),
				mainAmount,
				recurringAmount,
				currency,
				expiresAt: normalizedExpiresAt,
				publicTokenHash: tokenHash,
			},
		});

		return {
			published,
			publicUrl: newToken ? `${getSiteUrl()}/propostas/${newToken}` : null,
		};
	});

	await auditLog.write({
		action: "PROPOSAL_PUBLISHED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Proposal",
		resourceId: proposal.id,
		metadata: { version: result.published.version },
		headers: await headers(),
	});

	revalidatePath("/admin/proposals");
	revalidatePath(`/admin/proposals/${proposal.id}`);

	return {
		success: true,
		data: {
			versionId: result.published.id,
			version: result.published.version,
			publicUrl: result.publicUrl,
		},
	};
}

// biome-ignore-start lint/style/useNamingConvention: keys mirror Prisma ProposalStatus enum values
const ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
	DRAFT: ["PUBLISHED", "CANCELLED"],
	PUBLISHED: ["SENT", "CANCELLED"],
	SENT: ["ACCEPTED", "DECLINED", "CANCELLED"],
	ACCEPTED: [],
	DECLINED: [],
	CANCELLED: [],
	EXPIRED: [],
};
// biome-ignore-end lint/style/useNamingConvention: keys mirror Prisma ProposalStatus enum values

async function transitionProposal(
	proposalId: string,
	to: ProposalStatus,
	auditAction:
		| "PROPOSAL_MARKED_SENT"
		| "PROPOSAL_ACCEPTED"
		| "PROPOSAL_DECLINED"
		| "PROPOSAL_CANCELLED",
	extraData: Record<string, unknown> = {},
	auditMetadata: Record<string, unknown> = {},
): Promise<ActionResult> {
	const session = await requireAdmin();
	const proposal = await db.proposal.findUnique({
		where: { id: proposalId },
		select: { id: true, status: true },
	});
	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (!ALLOWED_TRANSITIONS[proposal.status].includes(to)) {
		return {
			success: false,
			error: `Transição inválida: ${proposal.status} → ${to}`,
		};
	}

	await db.proposal.update({
		where: { id: proposalId },
		data: {
			status: to,
			cancelledAt: to === "CANCELLED" ? new Date() : undefined,
			...extraData,
		} as Prisma.ProposalUncheckedUpdateInput,
	});

	await auditLog.write({
		action: auditAction,
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Proposal",
		resourceId: proposalId,
		metadata: auditMetadata,
		headers: await headers(),
	});

	revalidatePath(`/admin/proposals/${proposalId}`);
	revalidatePath("/admin/proposals");
	return { success: true };
}

export async function markProposalSent(input: {
	proposalId: string;
}): Promise<ActionResult> {
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(
		parsed.data.proposalId,
		"SENT",
		"PROPOSAL_MARKED_SENT",
	);
}

export async function acceptProposal(input: {
	proposalId: string;
}): Promise<ActionResult> {
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(
		parsed.data.proposalId,
		"ACCEPTED",
		"PROPOSAL_ACCEPTED",
	);
}

export async function declineProposal(input: {
	proposalId: string;
}): Promise<ActionResult> {
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(
		parsed.data.proposalId,
		"DECLINED",
		"PROPOSAL_DECLINED",
	);
}

export async function cancelProposal(
	input: z.infer<typeof cancelProposalSchema>,
): Promise<ActionResult> {
	const parsed = cancelProposalSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(
		parsed.data.proposalId,
		"CANCELLED",
		"PROPOSAL_CANCELLED",
		{},
		parsed.data.reason ? { reason: parsed.data.reason } : {},
	);
}

export async function rotateToken(input: {
	proposalId: string;
}): Promise<ActionResult<{ publicUrl: string }>> {
	const session = await requireAdmin();
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const proposal = await db.proposal.findUnique({
		where: { id: parsed.data.proposalId },
		select: { id: true, status: true },
	});
	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (proposal.status === "DRAFT" || proposal.status === "CANCELLED") {
		return {
			success: false,
			error: "Não há token para rotacionar neste estado",
		};
	}

	const newToken = generateToken();
	await db.proposal.update({
		where: { id: parsed.data.proposalId },
		data: { publicTokenHash: hashToken(newToken) },
	});

	await auditLog.write({
		action: "PROPOSAL_TOKEN_ROTATED",
		actorId: session.user.id,
		actorEmail: session.user.email,
		resourceType: "Proposal",
		resourceId: parsed.data.proposalId,
		headers: await headers(),
	});

	revalidatePath(`/admin/proposals/${parsed.data.proposalId}`);
	return {
		success: true,
		data: { publicUrl: `${getSiteUrl()}/propostas/${newToken}` },
	};
}
