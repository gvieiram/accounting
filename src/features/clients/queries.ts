import "server-only";

import type { ClientStatus, TaxRegime } from "@/generated/prisma/enums";
import { ClientType } from "@/generated/prisma/enums";
import type { ClientWhereInput } from "@/generated/prisma/models/Client";
import { db } from "@/lib/db";
import { CLIENTS_PAGE_SIZE } from "./constants";
import type { ClientListFilters, ParentClientCandidate } from "./types";
import { stripDocument } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClientListItem = {
	id: string;
	type: ClientType;
	legalName: string;
	tradeName: string | null;
	document: string;
	taxRegime: TaxRegime | null;
	status: ClientStatus;
	createdAt: Date;
	parentClientId: string | null;
	activeBranchesCount: number;
};

// ---------------------------------------------------------------------------
// listClients
// ---------------------------------------------------------------------------

/**
 * Returns a page of clients matching the given URL-driven filters.
 *
 * `archived` controls which "shelf" to query:
 *   - `true`  → archived clients only (`archivedAt IS NOT NULL`)
 *   - `false` / `undefined` → active shelf (`archivedAt IS NULL`)
 *
 * Note: `archived: true` does NOT suppress the `status` filter — archived
 * clients may be in any status. Prisma will AND both conditions together, which
 * is the intended behaviour for advanced filtering on the archived shelf.
 *
 * `q` digit detection: if `stripDocument(q).length >= 3` the stripped value is
 * also matched against `document.startsWith(…)`. The threshold is 3 so that a
 * partial CNPJ order code (e.g. "001") does not match every client whose CPF
 * starts with "001". Fewer than 3 stripped digits only adds text-field branches.
 */
export async function listClients(
	filters: ClientListFilters = {},
): Promise<ClientListItem[]> {
	const { q, type, status, archived } = filters;

	const where: ClientWhereInput = {
		archivedAt: archived === true ? { not: null } : null,
	};

	if (type !== undefined) {
		where.type = type;
	}

	if (status !== undefined) {
		where.status = status;
	}

	if (q && q.trim().length > 0) {
		const trimmed = q.trim();
		const stripped = stripDocument(trimmed);

		const orClauses: ClientWhereInput[] = [
			{ legalName: { contains: trimmed, mode: "insensitive" } },
			{ tradeName: { contains: trimmed, mode: "insensitive" } },
			{ primaryEmail: { contains: trimmed, mode: "insensitive" } },
		];

		if (stripped.length >= 3) {
			orClauses.push({ document: { startsWith: stripped } });
		}

		where.OR = orClauses;
	}

	const clients = await db.client.findMany({
		where,
		select: {
			id: true,
			type: true,
			legalName: true,
			tradeName: true,
			document: true,
			taxRegime: true,
			status: true,
			createdAt: true,
			parentClientId: true,
			_count: {
				select: {
					branches: { where: { archivedAt: null } },
				},
			},
		},
		orderBy: [{ legalName: "asc" }],
		take: CLIENTS_PAGE_SIZE,
	});

	return clients.map((client) => ({
		id: client.id,
		type: client.type,
		legalName: client.legalName,
		tradeName: client.tradeName,
		document: client.document,
		taxRegime: client.taxRegime,
		status: client.status,
		createdAt: client.createdAt,
		parentClientId: client.parentClientId,
		activeBranchesCount: client._count.branches,
	}));
}

// ---------------------------------------------------------------------------
// getClient
// ---------------------------------------------------------------------------

/**
 * Fetches a single client record by `id`, including all address fields,
 * additional contacts (JSON), the parent client (for the matriz badge), and
 * direct branches sorted active-first then alphabetically. Used by the
 * read-only detail page and the edit sheet.
 *
 * Returns `null` when no client with that id exists.
 */
export async function getClient(id: string) {
	return db.client.findUnique({
		where: { id },
		include: {
			parentClient: {
				select: { id: true, legalName: true, tradeName: true, document: true },
			},
			branches: {
				select: {
					id: true,
					type: true,
					legalName: true,
					tradeName: true,
					document: true,
					status: true,
					archivedAt: true,
				},
				orderBy: [{ archivedAt: "asc" }, { legalName: "asc" }],
			},
		},
	});
}

// ---------------------------------------------------------------------------
// listMatrizCandidates
// ---------------------------------------------------------------------------

/**
 * Returns up to 20 PJ clients eligible to be set as a parent (matriz).
 *
 * Eligibility rules:
 *   - `type = PJ` (only legal entities can be a matriz)
 *   - `archivedAt IS NULL` (archived matrizes cannot absorb new branches)
 *   - `parentClientId IS NULL` (a branch cannot itself become a matriz)
 *   - `id != excludeId` (exclude the client being edited from its own combobox)
 *
 * When `search` is empty/whitespace the first 20 matrizes by legalName are
 * returned so the combobox opens with a useful initial list.
 */
export async function listMatrizCandidates(input: {
	search: string;
	excludeId?: string;
}): Promise<ParentClientCandidate[]> {
	const { search, excludeId } = input;
	const trimmed = search.trim();
	const stripped = stripDocument(trimmed);

	const where: ClientWhereInput = {
		type: ClientType.PJ,
		archivedAt: null,
		parentClientId: null,
	};

	if (excludeId) {
		where.id = { not: excludeId };
	}

	if (trimmed.length > 0) {
		const orClauses: ClientWhereInput[] = [
			{ legalName: { contains: trimmed, mode: "insensitive" } },
			{ tradeName: { contains: trimmed, mode: "insensitive" } },
		];

		if (stripped.length >= 3) {
			orClauses.push({ document: { startsWith: stripped } });
		}

		where.OR = orClauses;
	}

	return db.client.findMany({
		where,
		select: {
			id: true,
			legalName: true,
			tradeName: true,
			document: true,
		},
		orderBy: [{ legalName: "asc" }],
		take: 20,
	});
}

// ---------------------------------------------------------------------------
// countClientsByStatus
// ---------------------------------------------------------------------------

export type ClientStatusCounts = {
	active: number;
	prospect: number;
	inactive: number;
	churned: number;
	archived: number;
};

/**
 * Aggregates client counts for the KPI strip on `/admin/clients`.
 *
 * The four status counts only include the *active shelf* (`archivedAt IS NULL`)
 * so users have a clean view of their working set. `archived` is a separate
 * cross-status count of everything on the archived shelf, surfaced as its own
 * KPI card.
 */
export async function countClientsByStatus(): Promise<ClientStatusCounts> {
	const [grouped, archived] = await Promise.all([
		db.client.groupBy({
			by: ["status"],
			where: { archivedAt: null },
			_count: { _all: true },
		}),
		db.client.count({ where: { archivedAt: { not: null } } }),
	]);

	const counts: ClientStatusCounts = {
		active: 0,
		prospect: 0,
		inactive: 0,
		churned: 0,
		archived,
	};

	for (const row of grouped) {
		switch (row.status) {
			case "ACTIVE":
				counts.active = row._count._all;
				break;
			case "PROSPECT":
				counts.prospect = row._count._all;
				break;
			case "INACTIVE":
				counts.inactive = row._count._all;
				break;
			case "CHURNED":
				counts.churned = row._count._all;
				break;
		}
	}

	return counts;
}

// ---------------------------------------------------------------------------
// countActiveBranches
// ---------------------------------------------------------------------------

/**
 * Counts how many active (non-archived) branches belong to a given matriz.
 *
 * Used by the archive dialog to show copy like "Esta matriz possui 3 filiais
 * ativas" and to decide whether to cascade-archive or block the operation.
 */
export async function countActiveBranches(matrizId: string): Promise<number> {
	return db.client.count({
		where: { parentClientId: matrizId, archivedAt: null },
	});
}
