// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const auditWriteMock = vi.fn();
const revalidatePathMock = vi.fn();

const clientFindUniqueMock = vi.fn();
const clientCreateMock = vi.fn();
const clientUpdateMock = vi.fn();
const clientCountMock = vi.fn();
const transactionMock = vi.fn();

let mockHeaders = new Headers();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/helpers", () => ({
	requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/audit/log", () => ({
	auditLog: { write: auditWriteMock },
}));

vi.mock("@/lib/db", () => ({
	db: {
		client: {
			findUnique: clientFindUniqueMock,
			create: clientCreateMock,
			update: clientUpdateMock,
			count: clientCountMock,
		},
		$transaction: transactionMock,
	},
}));

vi.mock("next/cache", () => ({
	revalidatePath: revalidatePathMock,
}));

vi.mock("next/headers", () => ({
	headers: async () => mockHeaders,
}));

const {
	archiveClientAction,
	createClientAction,
	unarchiveClientAction,
	updateClientAction,
} = await import("./actions");

const SESSION = {
	user: { id: "admin_1", email: "admin@duohub.com", name: "Admin" },
};

function makePj(overrides: Record<string, unknown> = {}) {
	return {
		type: "PJ",
		legalName: "Empresa Teste Ltda",
		document: "11222333000181",
		primaryEmail: "contato@empresa.com",
		primaryPhone: "1133334444",
		contactName: "Responsável Empresa",
		status: "ACTIVE",
		additionalContacts: [],
		...overrides,
	};
}

function makePf(overrides: Record<string, unknown> = {}) {
	return {
		type: "PF",
		legalName: "João Silva",
		document: "11144477735",
		primaryEmail: "joao@example.com",
		primaryPhone: "11987654321",
		contactName: "João Silva",
		status: "ACTIVE",
		additionalContacts: [],
		...overrides,
	};
}

function persistedClient(overrides: Record<string, unknown> = {}) {
	return {
		type: "PJ",
		legalName: "Empresa Teste Ltda",
		tradeName: null,
		document: "11222333000181",
		taxRegime: null,
		stateRegistration: null,
		cityRegistration: null,
		segment: null,
		primaryEmail: "contato@empresa.com",
		primaryPhone: "1133334444",
		contactName: "Responsável Empresa",
		zipCode: null,
		street: null,
		number: null,
		complement: null,
		neighborhood: null,
		city: null,
		state: null,
		additionalContacts: null,
		parentClientId: null,
		status: "ACTIVE",
		internalNotes: null,
		...overrides,
	};
}

beforeEach(() => {
	requireAdminMock.mockReset();
	requireAdminMock.mockResolvedValue(SESSION);
	auditWriteMock.mockReset();
	auditWriteMock.mockResolvedValue(undefined);
	revalidatePathMock.mockReset();
	clientFindUniqueMock.mockReset();
	clientFindUniqueMock.mockResolvedValue(null);
	clientCreateMock.mockReset();
	clientCreateMock.mockResolvedValue({
		id: "client_1",
		type: "PJ",
		legalName: "Empresa Teste Ltda",
	});
	clientUpdateMock.mockReset();
	clientCountMock.mockReset();
	clientCountMock.mockResolvedValue(0);
	transactionMock.mockReset();
	mockHeaders = new Headers();
});

describe("createClientAction", () => {
	it("returns invalid data for schema failures", async () => {
		const result = await createClientAction({ type: "PF" });

		expect(result).toEqual({ success: false, error: "Dados inválidos." });
		expect(clientCreateMock).not.toHaveBeenCalled();
	});

	it("surfaces duplicate document P2002", async () => {
		clientCreateMock.mockRejectedValue({ code: "P2002" });

		const result = await createClientAction(makePj());

		expect(result).toEqual({
			success: false,
			error: "Já existe um cliente com este documento.",
		});
	});

	it("rejects a missing matriz", async () => {
		clientFindUniqueMock.mockResolvedValue(null);

		const result = await createClientAction(
			makePj({
				document: "11222333000262",
				parentClientId: "parent_1",
				parentDocument: "11222333000181",
			}),
		);

		expect(result).toEqual({ success: false, error: "Matriz não encontrada." });
		expect(clientCreateMock).not.toHaveBeenCalled();
	});

	it("rejects an archived matriz", async () => {
		clientFindUniqueMock.mockResolvedValue({
			id: "parent_1",
			type: "PJ",
			parentClientId: null,
			archivedAt: new Date(),
			document: "11222333000181",
		});

		const result = await createClientAction(
			makePj({
				document: "11222333000262",
				parentClientId: "parent_1",
				parentDocument: "11222333000181",
			}),
		);

		expect(result).toEqual({
			success: false,
			error: "A matriz selecionada está arquivada.",
		});
	});

	it("rejects a parent that is not PJ", async () => {
		clientFindUniqueMock.mockResolvedValue({
			id: "parent_1",
			type: "PF",
			parentClientId: null,
			archivedAt: null,
			document: "11144477735",
		});

		const result = await createClientAction(
			makePj({ parentClientId: "parent_1" }),
		);

		expect(result).toEqual({
			success: false,
			error: "Filial só pode pertencer a uma matriz PJ.",
		});
	});

	it("rejects a parent that is already a filial", async () => {
		clientFindUniqueMock.mockResolvedValue({
			id: "parent_1",
			type: "PJ",
			parentClientId: "root_1",
			archivedAt: null,
			document: "11222333000181",
		});

		const result = await createClientAction(
			makePj({ parentClientId: "parent_1" }),
		);

		expect(result).toEqual({
			success: false,
			error: "O cliente selecionado já é uma filial.",
		});
	});

	it("rejects a mismatched CNPJ root", async () => {
		clientFindUniqueMock.mockResolvedValue({
			id: "parent_1",
			type: "PJ",
			parentClientId: null,
			archivedAt: null,
			document: "22333444000161",
		});

		const result = await createClientAction(
			makePj({
				document: "11222333000262",
				parentClientId: "parent_1",
				parentDocument: "11222333000181",
			}),
		);

		expect(result).toEqual({
			success: false,
			error: "O CNPJ da filial precisa compartilhar a raiz com a matriz.",
		});
	});

	it("creates client, writes audit and revalidates list", async () => {
		const result = await createClientAction(makePj());

		expect(result).toEqual({ success: true });
		expect(clientCreateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					document: "11222333000181",
					additionalContacts: [],
					parentClientId: null,
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "CLIENT_CREATED",
				actorId: "admin_1",
				resourceType: "Client",
				resourceId: "client_1",
				headers: mockHeaders,
			}),
		);
		expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients");
	});
});

describe("updateClientAction", () => {
	it("does not write audit when no fields changed", async () => {
		const before = persistedClient();
		clientFindUniqueMock.mockResolvedValue(before);
		clientUpdateMock.mockResolvedValue(before);

		const result = await updateClientAction("client_1", makePj());

		expect(result).toEqual({ success: true });
		expect(auditWriteMock).not.toHaveBeenCalled();
		expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients");
		expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients/client_1");
	});

	it("writes diff metadata when fields changed", async () => {
		clientFindUniqueMock.mockResolvedValue(
			persistedClient({ legalName: "Empresa Antiga Ltda" }),
		);
		clientUpdateMock.mockResolvedValue(persistedClient());

		const result = await updateClientAction("client_1", makePj());

		expect(result).toEqual({ success: true });
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "CLIENT_UPDATED",
				resourceId: "client_1",
				metadata: expect.objectContaining({
					changedFields: ["legalName"],
					legalName: "Empresa Teste Ltda",
				}),
			}),
		);
	});

	it("rejects PJ to PF changes while active branches exist", async () => {
		clientFindUniqueMock.mockResolvedValue(persistedClient({ type: "PJ" }));
		clientCountMock.mockResolvedValue(2);

		const result = await updateClientAction("client_1", makePf());

		expect(result).toEqual({
			success: false,
			error:
				"Não é possível alterar uma matriz para PF enquanto houver filiais ativas.",
		});
		expect(clientUpdateMock).not.toHaveBeenCalled();
	});

	it("rejects turning a matriz with active branches into a filial", async () => {
		clientFindUniqueMock.mockImplementation(async ({ where }) => {
			if (where.id === "client_1") return persistedClient();
			if (where.id === "parent_1") {
				return {
					id: "parent_1",
					type: "PJ",
					parentClientId: null,
					archivedAt: null,
					document: "11222333000181",
				};
			}
			return null;
		});
		clientCountMock.mockResolvedValue(3);

		const result = await updateClientAction(
			"client_1",
			makePj({
				document: "11222333000262",
				parentClientId: "parent_1",
				parentDocument: "11222333000181",
			}),
		);

		expect(result).toEqual({
			success: false,
			error:
				"Não é possível tornar uma matriz em filial enquanto houver filiais ativas vinculadas.",
		});
		expect(clientUpdateMock).not.toHaveBeenCalled();
	});

	it("rejects changing the matriz CNPJ root while active branches exist", async () => {
		clientFindUniqueMock.mockResolvedValue(persistedClient());
		clientCountMock.mockResolvedValue(1);

		const result = await updateClientAction(
			"client_1",
			makePj({ document: "11444777000161" }),
		);

		expect(result).toEqual({
			success: false,
			error:
				"Não é possível alterar a raiz do CNPJ de uma matriz com filiais ativas vinculadas.",
		});
		expect(clientUpdateMock).not.toHaveBeenCalled();
	});

	it("allows changing the matriz CNPJ root when there are no active branches", async () => {
		clientFindUniqueMock.mockResolvedValue(persistedClient());
		clientUpdateMock.mockResolvedValue(
			persistedClient({ document: "11444777000161" }),
		);
		clientCountMock.mockResolvedValue(0);

		const result = await updateClientAction(
			"client_1",
			makePj({ document: "11444777000161" }),
		);

		expect(result).toEqual({ success: true });
		expect(clientUpdateMock).toHaveBeenCalled();
	});
});

describe("archiveClientAction", () => {
	function setupTransaction({
		target,
		branches = [],
	}: {
		target: unknown;
		branches?: Array<{ id: string }>;
	}) {
		const txClient = {
			findUnique: vi.fn().mockResolvedValue(target),
			findMany: vi.fn().mockResolvedValue(branches),
			update: vi.fn().mockResolvedValue({}),
			updateMany: vi.fn().mockResolvedValue({ count: branches.length }),
		};
		transactionMock.mockImplementation(async (fn) => fn({ client: txClient }));
		return txClient;
	}

	it("is idempotent for an already archived client", async () => {
		const txClient = setupTransaction({
			target: {
				id: "client_1",
				legalName: "Arquivado",
				archivedAt: new Date(),
				parentClientId: null,
			},
		});

		const result = await archiveClientAction({ clientId: "client_1" });

		expect(result).toEqual({ success: true });
		expect(txClient.update).not.toHaveBeenCalled();
		expect(auditWriteMock).not.toHaveBeenCalled();
	});

	it("cascades active branches and includes their ids in audit metadata", async () => {
		const txClient = setupTransaction({
			target: {
				id: "matriz_1",
				legalName: "Matriz Ltda",
				archivedAt: null,
				parentClientId: null,
			},
			branches: [{ id: "filial_1" }, { id: "filial_2" }],
		});

		const result = await archiveClientAction({ clientId: "matriz_1" });

		expect(result).toEqual({ success: true });
		expect(txClient.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: { in: ["filial_1", "filial_2"] }, archivedAt: null },
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "CLIENT_DELETED",
				resourceId: "matriz_1",
				metadata: expect.objectContaining({
					cascadedBranchIds: ["filial_1", "filial_2"],
				}),
			}),
		);
	});

	it("does not cascade when the target is a filial", async () => {
		const txClient = setupTransaction({
			target: {
				id: "filial_1",
				legalName: "Filial Ltda",
				archivedAt: null,
				parentClientId: "matriz_1",
			},
		});

		const result = await archiveClientAction({ clientId: "filial_1" });

		expect(result).toEqual({ success: true });
		expect(txClient.findMany).not.toHaveBeenCalled();
		expect(txClient.updateMany).not.toHaveBeenCalled();
	});
});

describe("unarchiveClientAction", () => {
	function setupTransaction({
		target,
		parent,
		branches = [],
	}: {
		target: unknown;
		parent?: unknown;
		branches?: Array<{ id: string }>;
	}) {
		const txClient = {
			findUnique: vi.fn().mockImplementation(async ({ where }) => {
				if (
					parent !== undefined &&
					where?.id === (parent as { id?: string })?.id
				)
					return parent;
				return target;
			}),
			findMany: vi.fn().mockResolvedValue(branches),
			update: vi.fn().mockResolvedValue({}),
			updateMany: vi.fn().mockResolvedValue({ count: branches.length }),
		};
		transactionMock.mockImplementation(async (fn) => fn({ client: txClient }));
		return txClient;
	}

	it("rejects invalid input", async () => {
		const result = await unarchiveClientAction({ clientId: "" });
		expect(result).toEqual({ success: false, error: expect.any(String) });
	});

	it("returns notFound when target does not exist", async () => {
		setupTransaction({ target: null });
		const result = await unarchiveClientAction({ clientId: "missing" });
		expect(result.success).toBe(false);
	});

	it("is idempotent for an already active client", async () => {
		const txClient = setupTransaction({
			target: {
				id: "client_1",
				legalName: "Ativo",
				archivedAt: null,
				parentClientId: null,
			},
		});

		const result = await unarchiveClientAction({ clientId: "client_1" });

		expect(result).toEqual({ success: true });
		expect(txClient.update).not.toHaveBeenCalled();
		expect(auditWriteMock).not.toHaveBeenCalled();
	});

	it("cascades archived branches and audits with branch ids", async () => {
		const txClient = setupTransaction({
			target: {
				id: "matriz_1",
				legalName: "Matriz Ltda",
				archivedAt: new Date(),
				parentClientId: null,
			},
			branches: [{ id: "filial_1" }, { id: "filial_2" }],
		});

		const result = await unarchiveClientAction({ clientId: "matriz_1" });

		expect(result).toEqual({ success: true });
		expect(txClient.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { parentClientId: "matriz_1", archivedAt: { not: null } },
			}),
		);
		expect(txClient.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: { in: ["filial_1", "filial_2"] },
					archivedAt: { not: null },
				},
				data: { archivedAt: null },
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "CLIENT_RESTORED",
				resourceId: "matriz_1",
				metadata: expect.objectContaining({
					cascadedBranchIds: ["filial_1", "filial_2"],
				}),
			}),
		);
	});

	it("blocks restoring a branch whose matriz is still archived", async () => {
		setupTransaction({
			target: {
				id: "filial_1",
				legalName: "Filial Ltda",
				archivedAt: new Date(),
				parentClientId: "matriz_1",
			},
			parent: { id: "matriz_1", archivedAt: new Date() },
		});

		const result = await unarchiveClientAction({ clientId: "filial_1" });

		expect(result.success).toBe(false);
	});

	it("restores a branch when its matriz is active", async () => {
		const txClient = setupTransaction({
			target: {
				id: "filial_1",
				legalName: "Filial Ltda",
				archivedAt: new Date(),
				parentClientId: "matriz_1",
			},
			parent: { id: "matriz_1", archivedAt: null },
		});

		const result = await unarchiveClientAction({ clientId: "filial_1" });

		expect(result).toEqual({ success: true });
		expect(txClient.findMany).not.toHaveBeenCalled();
		expect(txClient.updateMany).not.toHaveBeenCalled();
		expect(txClient.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "filial_1" },
				data: { archivedAt: null },
			}),
		);
	});
});
