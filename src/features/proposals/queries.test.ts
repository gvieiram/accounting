// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyTemplate = vi.fn();
const findManyProposal = vi.fn();
const findUniqueProposal = vi.fn();
const findFirstPublished = vi.fn();
const findUniqueClient = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
	db: {
		proposalTemplate: { findMany: findManyTemplate },
		proposal: { findMany: findManyProposal, findUnique: findUniqueProposal },
		proposalPublishedVersion: { findFirst: findFirstPublished },
		client: { findUnique: findUniqueClient },
	},
}));

const queries = await import("./queries");

beforeEach(() => vi.clearAllMocks());

describe("getActiveTemplates", () => {
	it("filters by isActive=true", async () => {
		findManyTemplate.mockResolvedValue([]);
		await queries.getActiveTemplates();
		expect(findManyTemplate).toHaveBeenCalledWith({
			where: { isActive: true },
			include: { currentVersion: true },
			orderBy: { name: "asc" },
		});
	});
});

describe("findClientByDocument", () => {
	it("normalizes before lookup", async () => {
		findUniqueClient.mockResolvedValue(null);
		await queries.findClientByDocument("123.456.789-09");
		expect(findUniqueClient).toHaveBeenCalledWith({
			where: { document: "12345678909" },
			select: { id: true, legalName: true, status: true, document: true },
		});
	});
	it("returns null for empty input", async () => {
		expect(await queries.findClientByDocument("")).toBeNull();
		expect(findUniqueClient).not.toHaveBeenCalled();
	});
});
