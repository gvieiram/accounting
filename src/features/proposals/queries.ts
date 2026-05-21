import "server-only";
import { db } from "@/lib/db";
import { normalizeDocument } from "./normalize-document";

export async function getActiveTemplates() {
	return db.proposalTemplate.findMany({
		where: { isActive: true },
		include: { currentVersion: true },
		orderBy: { name: "asc" },
	});
}

export async function listProposals(
	opts: { limit?: number; offset?: number } = {},
) {
	const { limit = 50, offset = 0 } = opts;
	return db.proposal.findMany({
		include: {
			template: true,
			client: { select: { id: true, legalName: true, document: true } },
		},
		orderBy: { createdAt: "desc" },
		take: limit,
		skip: offset,
	});
}

export async function getProposalById(id: string) {
	return db.proposal.findUnique({
		where: { id },
		include: {
			template: { include: { currentVersion: true } },
			templateVersion: true,
			client: true,
			publishedVersions: { orderBy: { version: "desc" } },
		},
	});
}

export async function getProposalPublishedVersion(
	proposalId: string,
	versionId: string,
) {
	return db.proposalPublishedVersion.findFirst({
		where: { id: versionId, proposalId },
	});
}

export async function findClientByDocument(document: string) {
	const normalized = normalizeDocument(document);
	if (!normalized) return null;
	return db.client.findUnique({
		where: { document: normalized },
		select: { id: true, legalName: true, status: true, document: true },
	});
}
