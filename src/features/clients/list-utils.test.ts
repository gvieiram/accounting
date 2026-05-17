import { describe, expect, it } from "vitest";

import { buildKpiHref, orderClients } from "./list-utils";
import type { ClientListItem } from "./queries";

function makeClient(
	overrides: Partial<ClientListItem> & Pick<ClientListItem, "id">,
): ClientListItem {
	return {
		type: "PJ",
		legalName: `Legal ${overrides.id}`,
		tradeName: null,
		document: "00000000000000",
		taxRegime: null,
		status: "ACTIVE",
		createdAt: new Date("2025-01-01T00:00:00Z"),
		parentClientId: null,
		archivedAt: null,
		activeBranchesCount: 0,
		...overrides,
	};
}

describe("orderClients", () => {
	it("returns an empty array when given an empty input", () => {
		expect(orderClients([])).toEqual([]);
	});

	it("keeps independent clients in their original order", () => {
		const a = makeClient({ id: "a" });
		const b = makeClient({ id: "b" });
		const c = makeClient({ id: "c" });

		expect(orderClients([a, b, c]).map((client) => client.id)).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("places each matriz immediately followed by its branches", () => {
		const acme = makeClient({ id: "acme", activeBranchesCount: 2 });
		const acmeRj = makeClient({ id: "acme-rj", parentClientId: "acme" });
		const acmeSp = makeClient({ id: "acme-sp", parentClientId: "acme" });
		const beta = makeClient({ id: "beta", activeBranchesCount: 1 });
		const betaA = makeClient({ id: "beta-a", parentClientId: "beta" });

		// Intentionally interleave the input to prove the function regroups.
		const ordered = orderClients([acme, beta, acmeRj, betaA, acmeSp]);

		expect(ordered.map((client) => client.id)).toEqual([
			"acme",
			"acme-rj",
			"acme-sp",
			"beta",
			"beta-a",
		]);
	});

	it("appends orphaned branches whose matriz is missing at the end", () => {
		const matriz = makeClient({ id: "matriz", activeBranchesCount: 1 });
		const branch = makeClient({ id: "branch", parentClientId: "matriz" });
		const orphan = makeClient({
			id: "orphan",
			parentClientId: "missing-matriz",
		});

		const ordered = orderClients([matriz, branch, orphan]);

		expect(ordered.map((client) => client.id)).toEqual([
			"matriz",
			"branch",
			"orphan",
		]);
	});

	it("does not duplicate clients when input contains a branch before its matriz", () => {
		const branch = makeClient({ id: "branch", parentClientId: "matriz" });
		const matriz = makeClient({ id: "matriz", activeBranchesCount: 1 });

		const ordered = orderClients([branch, matriz]);

		expect(ordered).toHaveLength(2);
		expect(ordered.map((client) => client.id)).toEqual(["matriz", "branch"]);
	});
});

describe("buildKpiHref", () => {
	it("returns the bare path when the card is already the active filter", () => {
		expect(buildKpiHref("ACTIVE", false, true)).toBe("/admin/clients");
		expect(buildKpiHref(undefined, true, true)).toBe("/admin/clients");
	});

	it("builds a status filter href for non-archived KPI cards", () => {
		expect(buildKpiHref("ACTIVE", false, false)).toBe(
			"/admin/clients?status=ACTIVE",
		);
		expect(buildKpiHref("PROSPECT", false, false)).toBe(
			"/admin/clients?status=PROSPECT",
		);
		expect(buildKpiHref("INACTIVE", false, false)).toBe(
			"/admin/clients?status=INACTIVE",
		);
	});

	it("builds the archived shelf href without a status param", () => {
		expect(buildKpiHref(undefined, true, false)).toBe(
			"/admin/clients?archived=1",
		);
	});

	it("returns the bare path when no status and not archived", () => {
		expect(buildKpiHref(undefined, false, false)).toBe("/admin/clients");
	});
});
