import type { ClientStatus } from "@/generated/prisma/enums";

import type { ClientListItem } from "./queries";

// ---------------------------------------------------------------------------
// orderClients
// ---------------------------------------------------------------------------

/**
 * Returns clients sorted so each matriz is immediately followed by its
 * branches. Independent clients (with no parent and no children) keep their
 * incoming order at the end of the matriz block they belong to.
 *
 * Items whose `parentClientId` references a matriz that is NOT in the input
 * (e.g. orphaned filiais when the matriz was filtered out) are appended at
 * the tail so they remain visible.
 */
export function orderClients(clients: ClientListItem[]): ClientListItem[] {
	const byParent = new Map<string | null, ClientListItem[]>();
	for (const client of clients) {
		const list = byParent.get(client.parentClientId) ?? [];
		list.push(client);
		byParent.set(client.parentClientId, list);
	}

	const roots = byParent.get(null) ?? [];
	const result: ClientListItem[] = [];

	for (const root of roots) {
		result.push(root);
		result.push(...(byParent.get(root.id) ?? []));
	}

	for (const client of clients) {
		if (!result.includes(client)) result.push(client);
	}

	return result;
}

// ---------------------------------------------------------------------------
// buildKpiHref
// ---------------------------------------------------------------------------

export type KpiHrefStatus = Extract<
	ClientStatus,
	"ACTIVE" | "PROSPECT" | "INACTIVE"
>;

/**
 * Builds the navigation href for a KPI card on `/admin/clients`.
 *
 * Behaviour:
 *  - When the card is the *currently active* filter (`isAlreadyActive`),
 *    returns the bare path so clicking again clears the filter.
 *  - The "Arquivados" card sets `?archived=1` and never mixes with a status
 *    filter (callers must not pass both).
 *  - The three status cards build `?status=<value>` without `archived`.
 */
export function buildKpiHref(
	status: KpiHrefStatus | undefined,
	archived: boolean,
	isAlreadyActive: boolean,
): string {
	if (isAlreadyActive) return "/admin/clients";
	const params = new URLSearchParams();
	if (archived) params.set("archived", "1");
	if (status) params.set("status", status);
	const query = params.toString();
	return query ? `/admin/clients?${query}` : "/admin/clients";
}
