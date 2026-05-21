// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const auditWriteMock = vi.fn();
const revalidatePathMock = vi.fn();
const headersMock = vi.fn(async () => new Headers());
const templateFindUnique = vi.fn();
const proposalCreate = vi.fn();
const proposalFindUnique = vi.fn();
const proposalUpdateMock = vi.fn();
const clientFindUnique = vi.fn();
const clientUpdateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth/helpers", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit/log", () => ({ auditLog: { write: auditWriteMock } }));
vi.mock("@/lib/site-url", () => ({
	getSiteUrl: () => "http://localhost:3000",
}));
vi.mock("@/lib/db", () => ({
	db: {
		proposalTemplate: { findUnique: templateFindUnique },
		proposal: {
			create: proposalCreate,
			findUnique: proposalFindUnique,
			update: proposalUpdateMock,
		},
		client: { findUnique: clientFindUnique, update: clientUpdateMock },
		$transaction: transactionMock,
	},
}));

const actions = await import("./actions");

beforeEach(() => {
	vi.clearAllMocks();
	// requireAdmin returns a session: { user: { id, email } }
	requireAdminMock.mockResolvedValue({
		user: { id: "admin-1", email: "a@b.com" },
	});
});

describe("createProposalDraft", () => {
	it("creates DRAFT with template defaultContent", async () => {
		templateFindUnique.mockResolvedValue({
			id: "tmpl-1",
			key: "DESENQUADRAMENTO",
			category: "CONTINUOUS",
			isActive: true,
			currentVersionId: "ver-1",
			currentVersion: {
				id: "ver-1",
				defaultContent: { summary: { text: "ok" } },
			},
		});
		proposalCreate.mockResolvedValue({ id: "prop-1" });

		const r = await actions.createProposalDraft({
			templateKey: "DESENQUADRAMENTO",
			clientId: "client-1",
		});

		expect(r.success).toBe(true);
		expect(proposalCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					templateId: "tmpl-1",
					clientId: "client-1",
					status: "DRAFT",
					editableContent: { summary: { text: "ok" } },
					createdById: "admin-1",
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "PROPOSAL_CREATED",
				resourceType: "Proposal",
				resourceId: "prop-1",
			}),
		);
	});

	it("rejects inactive template", async () => {
		templateFindUnique.mockResolvedValue({
			id: "t",
			isActive: false,
			currentVersion: { id: "v", defaultContent: {} },
		});
		const r = await actions.createProposalDraft({
			templateKey: "DESENQUADRAMENTO",
			clientId: "c",
		});
		expect(r.success).toBe(false);
	});

	it("rejects both clientId and prospectData", async () => {
		const r = await actions.createProposalDraft({
			templateKey: "DESENQUADRAMENTO",
			clientId: "c",
			prospectData: { type: "PF", name: "M", document: "12345678909" },
		});
		expect(r.success).toBe(false);
	});
});

describe("saveProposalSection", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		proposalUpdateMock.mockReset();
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "DRAFT",
			editableContent: { existing: { ok: true } },
		});
	});

	it("merges into editableContent without audit", async () => {
		const r = await actions.saveProposalSection({
			proposalId: "p1",
			sectionKey: "summary",
			sectionData: { text: "novo" },
		});
		expect(r.success).toBe(true);
		expect(proposalUpdateMock).toHaveBeenCalledWith({
			where: { id: "p1" },
			data: {
				editableContent: {
					existing: { ok: true },
					summary: { text: "novo" },
				},
			},
		});
		expect(auditWriteMock).not.toHaveBeenCalled();
	});

	it("rejects when not DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "PUBLISHED",
			editableContent: {},
		});
		const r = await actions.saveProposalSection({
			proposalId: "p1",
			sectionKey: "summary",
			sectionData: { text: "x" },
		});
		expect(r.success).toBe(false);
	});

	it("rejects empty sectionKey", async () => {
		const r = await actions.saveProposalSection({
			proposalId: "p1",
			sectionKey: "",
			sectionData: {},
		});
		expect(r.success).toBe(false);
	});
});
