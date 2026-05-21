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

describe("publishProposal", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		transactionMock.mockReset();
		clientFindUnique.mockReset();
	});

	it("publishes DRAFT, creates snapshot + renderedHtml + token", async () => {
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "DRAFT",
			clientId: "c1",
			prospectData: null,
			editableContent: {
				summary: {
					text: "Resumo executivo completo da proposta de desenquadramento.",
				},
				budget: {
					modality: "Mensal",
					monthlyRevenue: "Até R$ 30.000",
					invoiceLimitDescription: "Sem limite",
				},
				extra: { title: "Extra", description: "Descrição" },
				terms: {
					validityText: "30 dias",
					billingDay: "10",
					noticePeriod: "30 dias",
				},
			},
			mainAmount: 500,
			recurringAmount: 400,
			currency: "BRL",
			commercialData: {},
			expiresAt: new Date("2026-07-01"),
			publicTokenHash: null,
			template: {
				key: "DESENQUADRAMENTO",
				category: "CONTINUOUS",
				currentVersion: { version: 1 },
			},
			templateVersion: { version: 1 },
			client: { id: "c1", legalName: "Acme", document: "12345678000190" },
		});

		const createPV = vi.fn().mockResolvedValue({ id: "pv-1", version: 1 });
		transactionMock.mockImplementation(async (fn) => {
			return fn({
				proposal: {
					findUnique: proposalFindUnique,
					update: proposalUpdateMock,
				},
				proposalPublishedVersion: {
					count: vi.fn().mockResolvedValue(0),
					create: createPV,
				},
				client: { findUnique: clientFindUnique, create: vi.fn() },
			});
		});

		const r = await actions.publishProposal({
			proposalId: "p1",
			commercial: {
				category: "CONTINUOUS",
				recurringAmount: 400,
				currency: "BRL",
				expiresAt: "2026-07-01",
			},
		});
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.publicUrl).toMatch(/^http:\/\/localhost:3000\/propostas\//);
		}
		expect(createPV).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					proposalId: "p1",
					version: 1,
					renderedHtml: expect.any(String),
					snapshot: expect.objectContaining({
						editableContent: expect.any(Object),
					}),
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({ action: "PROPOSAL_PUBLISHED" }),
		);
	});

	it("rejects publish on non-DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "PUBLISHED",
			template: { category: "CONTINUOUS" },
			templateVersion: { version: 1 },
		});
		const r = await actions.publishProposal({
			proposalId: "p1",
			commercial: {
				category: "CONTINUOUS",
				recurringAmount: 400,
				currency: "BRL",
				expiresAt: "2026-07-01",
			},
		});
		expect(r.success).toBe(false);
	});
});

describe("transitions", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		proposalUpdateMock.mockReset();
	});

	it("markProposalSent PUBLISHED→SENT", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "PUBLISHED" });
		const r = await actions.markProposalSent({ proposalId: "p" });
		expect(r.success).toBe(true);
		expect(proposalUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "SENT" }),
			}),
		);
	});

	it("rejects markProposalSent on DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "DRAFT" });
		expect((await actions.markProposalSent({ proposalId: "p" })).success).toBe(
			false,
		);
	});

	it("cancelProposal sets cancelledAt", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "PUBLISHED" });
		await actions.cancelProposal({ proposalId: "p", reason: "dup" });
		expect(proposalUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					status: "CANCELLED",
					cancelledAt: expect.any(Date),
				}),
			}),
		);
	});

	it("acceptProposal SENT→ACCEPTED", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "SENT" });
		expect((await actions.acceptProposal({ proposalId: "p" })).success).toBe(
			true,
		);
	});

	it("declineProposal SENT→DECLINED", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "SENT" });
		expect((await actions.declineProposal({ proposalId: "p" })).success).toBe(
			true,
		);
	});
});
