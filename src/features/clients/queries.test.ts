// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENTS_PAGE_SIZE } from "./constants";

const clientFindManyMock = vi.fn();
const clientFindUniqueMock = vi.fn();
const clientCountMock = vi.fn();
const clientGroupByMock = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
	db: {
		client: {
			findMany: clientFindManyMock,
			findUnique: clientFindUniqueMock,
			count: clientCountMock,
			groupBy: clientGroupByMock,
		},
	},
}));

const {
	countActiveBranches,
	countClientsByStatus,
	getClient,
	listClients,
	listMatrizCandidates,
} = await import("./queries");

beforeEach(() => {
	clientFindManyMock.mockReset();
	clientFindManyMock.mockResolvedValue([]);
	clientFindUniqueMock.mockReset();
	clientFindUniqueMock.mockResolvedValue(null);
	clientCountMock.mockReset();
	clientCountMock.mockResolvedValue(0);
	clientGroupByMock.mockReset();
	clientGroupByMock.mockResolvedValue([]);
});

describe("listClients", () => {
	it("queries active clients by default with table projection", async () => {
		await listClients();

		expect(clientFindManyMock).toHaveBeenCalledWith({
			where: { archivedAt: null },
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
	});

	it("queries only archived clients when archived=true", async () => {
		await listClients({ archived: true });

		expect(clientFindManyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { archivedAt: { not: null } },
			}),
		);
	});

	it("adds type and status filters", async () => {
		await listClients({ type: "PJ", status: "PROSPECT" });

		expect(clientFindManyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					archivedAt: null,
					type: "PJ",
					status: "PROSPECT",
				},
			}),
		);
	});

	it("searches text fields with case-insensitive contains", async () => {
		await listClients({ q: "  acme  " });

		expect(clientFindManyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					// biome-ignore lint/style/useNamingConvention: Prisma query key.
					OR: [
						{ legalName: { contains: "acme", mode: "insensitive" } },
						{ tradeName: { contains: "acme", mode: "insensitive" } },
						{ primaryEmail: { contains: "acme", mode: "insensitive" } },
					],
				}),
			}),
		);
	});

	it("also searches document prefix when query has enough digits", async () => {
		await listClients({ q: "11.222.333" });

		expect(clientFindManyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					// biome-ignore lint/style/useNamingConvention: Prisma query key.
					OR: expect.arrayContaining([
						{ document: { startsWith: "11222333" } },
					]),
				}),
			}),
		);
	});

	it("does not add document prefix branch for fewer than 3 digits", async () => {
		await listClients({ q: "12" });

		const call = clientFindManyMock.mock.calls[0]?.[0];
		expect(call.where.OR).not.toContainEqual({
			document: { startsWith: expect.any(String) },
		});
	});
});

describe("getClient", () => {
	it("fetches a single client with parent relation and branches", async () => {
		await getClient("client_1");

		expect(clientFindUniqueMock).toHaveBeenCalledWith({
			where: { id: "client_1" },
			include: {
				parentClient: {
					select: {
						id: true,
						legalName: true,
						tradeName: true,
						document: true,
					},
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
	});
});

describe("listMatrizCandidates", () => {
	it("lists active PJ matrizes with default ordering", async () => {
		await listMatrizCandidates({ search: "" });

		expect(clientFindManyMock).toHaveBeenCalledWith({
			where: {
				type: "PJ",
				archivedAt: null,
				parentClientId: null,
			},
			select: {
				id: true,
				legalName: true,
				tradeName: true,
				document: true,
			},
			orderBy: [{ legalName: "asc" }],
			take: 20,
		});
	});

	it("excludes the edited client and searches by name/document", async () => {
		await listMatrizCandidates({
			search: "11.222",
			excludeId: "client_1",
		});

		expect(clientFindManyMock).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					type: "PJ",
					archivedAt: null,
					parentClientId: null,
					id: { not: "client_1" },
					// biome-ignore lint/style/useNamingConvention: Prisma query key.
					OR: [
						{ legalName: { contains: "11.222", mode: "insensitive" } },
						{ tradeName: { contains: "11.222", mode: "insensitive" } },
						{ document: { startsWith: "11222" } },
					],
				},
			}),
		);
	});
});

describe("countActiveBranches", () => {
	it("counts only non-archived branches of the given matriz", async () => {
		await countActiveBranches("matriz_1");

		expect(clientCountMock).toHaveBeenCalledWith({
			where: { parentClientId: "matriz_1", archivedAt: null },
		});
	});
});

describe("countClientsByStatus", () => {
	it("queries the active shelf grouped by status and the archived count in parallel", async () => {
		await countClientsByStatus();

		expect(clientGroupByMock).toHaveBeenCalledWith({
			by: ["status"],
			where: { archivedAt: null },
			_count: { _all: true },
		});
		expect(clientCountMock).toHaveBeenCalledWith({
			where: { archivedAt: { not: null } },
		});
	});

	it("returns all-zero counts when there are no clients", async () => {
		clientGroupByMock.mockResolvedValueOnce([]);
		clientCountMock.mockResolvedValueOnce(0);

		await expect(countClientsByStatus()).resolves.toEqual({
			active: 0,
			prospect: 0,
			inactive: 0,
			churned: 0,
			archived: 0,
		});
	});

	it("maps each Prisma status row to the matching counter", async () => {
		clientGroupByMock.mockResolvedValueOnce([
			{ status: "ACTIVE", _count: { _all: 12 } },
			{ status: "PROSPECT", _count: { _all: 3 } },
			{ status: "INACTIVE", _count: { _all: 1 } },
			{ status: "CHURNED", _count: { _all: 5 } },
		]);
		clientCountMock.mockResolvedValueOnce(7);

		await expect(countClientsByStatus()).resolves.toEqual({
			active: 12,
			prospect: 3,
			inactive: 1,
			churned: 5,
			archived: 7,
		});
	});

	it("leaves a counter at zero when its status is missing from the groupBy result", async () => {
		clientGroupByMock.mockResolvedValueOnce([
			{ status: "ACTIVE", _count: { _all: 4 } },
			// PROSPECT, INACTIVE, CHURNED intentionally absent
		]);
		clientCountMock.mockResolvedValueOnce(0);

		await expect(countClientsByStatus()).resolves.toEqual({
			active: 4,
			prospect: 0,
			inactive: 0,
			churned: 0,
			archived: 0,
		});
	});
});
