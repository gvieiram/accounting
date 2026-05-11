import { describe, expect, it } from "vitest";
import {
	additionalContactSchema,
	archiveClientSchema,
	clientSchema,
} from "./schemas";

// ---------------------------------------------------------------------------
// Shared test helpers
// ---------------------------------------------------------------------------

/** Minimal valid PF payload. */
function makePf(overrides: Record<string, unknown> = {}) {
	return {
		type: "PF",
		legalName: "João Silva",
		document: "11144477735", // known-valid CPF
		primaryEmail: "joao@example.com",
		primaryPhone: "11987654321",
		contactName: "João Silva",
		status: "ACTIVE",
		...overrides,
	};
}

/** Minimal valid PJ payload. */
function makePj(overrides: Record<string, unknown> = {}) {
	return {
		type: "PJ",
		legalName: "Empresa Teste Ltda",
		document: "11222333000181", // known-valid CNPJ (matriz)
		primaryEmail: "contato@empresa.com",
		primaryPhone: "1133334444",
		contactName: "Responsável Empresa",
		status: "ACTIVE",
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// additionalContactSchema
// ---------------------------------------------------------------------------

describe("additionalContactSchema", () => {
	it("accepts a fully valid additional contact", () => {
		const result = additionalContactSchema.safeParse({
			name: "Maria Souza",
			role: "Financeiro",
			email: "maria@example.com",
			phone: "11987654321",
		});
		expect(result.success).toBe(true);
	});

	it("accepts a contact without optional role", () => {
		const result = additionalContactSchema.safeParse({
			name: "Carlos",
			email: "carlos@example.com",
			phone: "1133334444",
		});
		expect(result.success).toBe(true);
	});

	it("coerces empty role string to undefined", () => {
		const result = additionalContactSchema.safeParse({
			name: "Ana",
			role: "",
			email: "ana@example.com",
			phone: "11912345678",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.role).toBeUndefined();
		}
	});

	it("rejects missing name", () => {
		const result = additionalContactSchema.safeParse({
			email: "x@example.com",
			phone: "11912345678",
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid email", () => {
		const result = additionalContactSchema.safeParse({
			name: "Test",
			email: "not-an-email",
			phone: "11912345678",
		});
		expect(result.success).toBe(false);
	});

	it("rejects phone with wrong length (9 digits)", () => {
		const result = additionalContactSchema.safeParse({
			name: "Test",
			email: "test@example.com",
			phone: "119123456", // 9 digits
		});
		expect(result.success).toBe(false);
	});

	it("normalises email to lowercase", () => {
		const result = additionalContactSchema.safeParse({
			name: "Test",
			email: "TEST@EXAMPLE.COM",
			phone: "11912345678",
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.email).toBe("test@example.com");
		}
	});
});

// ---------------------------------------------------------------------------
// clientSchema — PF
// ---------------------------------------------------------------------------

describe("clientSchema — PF", () => {
	it("accepts minimal valid PF", () => {
		const result = clientSchema.safeParse(makePf());
		expect(result.success).toBe(true);
	});

	it("rejects CPF with invalid checksum", () => {
		const result = clientSchema.safeParse(makePf({ document: "12345678901" }));
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("document"),
			);
			expect(issue).toBeDefined();
			expect(issue?.message).toMatch(/CPF inválido/);
		}
	});

	it("rejects CPF with wrong length — 10 digits", () => {
		const result = clientSchema.safeParse(makePf({ document: "1114447773" }));
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("document"),
			);
			expect(issue).toBeDefined();
		}
	});

	it("rejects CPF with wrong length — 12 digits", () => {
		const result = clientSchema.safeParse(makePf({ document: "111444777350" }));
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("document"),
			);
			expect(issue).toBeDefined();
		}
	});

	it("rejects all-equal CPF (e.g. 11111111111)", () => {
		const result = clientSchema.safeParse(makePf({ document: "11111111111" }));
		expect(result.success).toBe(false);
	});

	it("strips CPF formatting before validation (formatted CPF passes)", () => {
		// stripDocument runs first, so "111.444.777-35" becomes "11144477735"
		const result = clientSchema.safeParse(
			makePf({ document: "111.444.777-35" }),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.document).toBe("11144477735");
		}
	});

	it("rejects PF with parentClientId set", () => {
		const result = clientSchema.safeParse(
			makePf({ parentClientId: "some-client-id" }),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("parentClientId"),
			);
			expect(issue).toBeDefined();
			expect(issue?.message).toMatch(/Apenas PJ pode ter matriz/);
		}
	});

	it("accepts PF with parentClientId null", () => {
		const result = clientSchema.safeParse(makePf({ parentClientId: null }));
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// clientSchema — PJ
// ---------------------------------------------------------------------------

describe("clientSchema — PJ", () => {
	it("accepts minimal valid PJ (matriz)", () => {
		const result = clientSchema.safeParse(makePj());
		expect(result.success).toBe(true);
	});

	it("rejects CNPJ with invalid checksum", () => {
		const result = clientSchema.safeParse(
			makePj({ document: "12345678000190" }),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("document"),
			);
			expect(issue).toBeDefined();
			expect(issue?.message).toMatch(/CNPJ inválido/);
		}
	});

	it("rejects CNPJ with wrong length — 13 digits", () => {
		const result = clientSchema.safeParse(
			makePj({ document: "1122233300018" }),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("document"),
			);
			expect(issue).toBeDefined();
		}
	});

	it("rejects CNPJ with wrong length — 15 digits", () => {
		const result = clientSchema.safeParse(
			makePj({ document: "112223330001810" }),
		);
		expect(result.success).toBe(false);
	});

	it("rejects all-equal CNPJ (e.g. 00000000000000)", () => {
		const result = clientSchema.safeParse(
			makePj({ document: "00000000000000" }),
		);
		expect(result.success).toBe(false);
	});

	it("strips CNPJ formatting before validation", () => {
		const result = clientSchema.safeParse(
			makePj({ document: "11.222.333/0001-81" }),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.document).toBe("11222333000181");
		}
	});

	it("accepts PJ filial when cnpjRoot matches matriz", () => {
		// filial 11222333000262 shares root 11222333 with matriz 11222333000181
		const result = clientSchema.safeParse(
			makePj({
				document: "11222333000262", // valid filial CNPJ, same root
				parentClientId: "some-parent-id",
				parentDocument: "11222333000181",
			}),
		);
		expect(result.success).toBe(true);
	});

	it("rejects PJ filial when cnpjRoot does not match matriz", () => {
		// filial 22333444000181 has root 22333444, different from 11222333
		const result = clientSchema.safeParse(
			makePj({
				document: "11222333000181",
				parentClientId: "some-parent-id",
				parentDocument: "22333444000181", // different root
			}),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			const issue = result.error.issues.find((i) =>
				i.path.includes("document"),
			);
			expect(issue).toBeDefined();
			expect(issue?.message).toMatch(/raiz do CNPJ/);
		}
	});

	it("skips cnpjRoot check when parentDocument is absent (parentClientId only)", () => {
		// parentClientId set but parentDocument not provided → no root check
		const result = clientSchema.safeParse(
			makePj({
				document: "11222333000181",
				parentClientId: "some-parent-id",
				// parentDocument intentionally omitted
			}),
		);
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// clientSchema — additionalContacts
// ---------------------------------------------------------------------------

describe("clientSchema — additionalContacts", () => {
	it("defaults additionalContacts to [] when omitted", () => {
		const result = clientSchema.safeParse(makePf());
		expect(result.success).toBe(true);
		if (result.success) {
			expect(Array.isArray(result.data.additionalContacts)).toBe(true);
			expect(result.data.additionalContacts).toHaveLength(0);
		}
	});

	it("rejects additionalContacts array with 11 items (max is 10)", () => {
		const contacts = Array.from({ length: 11 }, (_, i) => ({
			name: `Contact ${i}`,
			email: `contact${i}@example.com`,
			phone: "11912345678",
		}));
		const result = clientSchema.safeParse(
			makePf({ additionalContacts: contacts }),
		);
		expect(result.success).toBe(false);
	});

	it("accepts additionalContacts array with exactly 10 items", () => {
		const contacts = Array.from({ length: 10 }, (_, i) => ({
			name: `Contact ${i}`,
			email: `contact${i}@example.com`,
			phone: "11912345678",
		}));
		const result = clientSchema.safeParse(
			makePf({ additionalContacts: contacts }),
		);
		expect(result.success).toBe(true);
	});

	it("propagates inner schema error when an additional contact has invalid email", () => {
		const result = clientSchema.safeParse(
			makePf({
				additionalContacts: [
					{
						name: "Bad Contact",
						email: "not-valid",
						phone: "11912345678",
					},
				],
			}),
		);
		expect(result.success).toBe(false);
		if (!result.success) {
			const hasEmailError = result.error.issues.some(
				(i) =>
					i.path.includes("additionalContacts") && i.path.includes("email"),
			);
			expect(hasEmailError).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// clientSchema — optional field normalisation
// ---------------------------------------------------------------------------

describe("clientSchema — optional field normalisation", () => {
	it("coerces empty tradeName to undefined", () => {
		const result = clientSchema.safeParse(makePf({ tradeName: "" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.tradeName).toBeUndefined();
		}
	});

	it("coerces empty internalNotes to undefined", () => {
		const result = clientSchema.safeParse(makePf({ internalNotes: "" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.internalNotes).toBeUndefined();
		}
	});

	it("coerces empty stateRegistration to undefined", () => {
		const result = clientSchema.safeParse(makePj({ stateRegistration: "" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.stateRegistration).toBeUndefined();
		}
	});

	it("coerces empty cityRegistration to undefined", () => {
		const result = clientSchema.safeParse(makePj({ cityRegistration: "" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.cityRegistration).toBeUndefined();
		}
	});

	it("coerces empty segment to undefined", () => {
		const result = clientSchema.safeParse(makePj({ segment: "" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.segment).toBeUndefined();
		}
	});

	it("coerces empty zipCode to undefined", () => {
		const result = clientSchema.safeParse(makePf({ zipCode: "" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.zipCode).toBeUndefined();
		}
	});

	it("accepts a valid 8-digit zipCode", () => {
		const result = clientSchema.safeParse(makePf({ zipCode: "01310100" }));
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.zipCode).toBe("01310100");
		}
	});

	it("rejects a zipCode with non-digit characters that is not empty", () => {
		// The schema accepts only /^\d{8}$/ or ""; "01310-100" (with hyphen) does not match
		const result = clientSchema.safeParse(makePf({ zipCode: "01310-100" }));
		expect(result.success).toBe(false);
	});

	it("accepts taxRegime as null", () => {
		const result = clientSchema.safeParse(makePj({ taxRegime: null }));
		expect(result.success).toBe(true);
	});

	it("accepts a valid taxRegime", () => {
		const result = clientSchema.safeParse(
			makePj({ taxRegime: "SIMPLES_NACIONAL" }),
		);
		expect(result.success).toBe(true);
	});

	it("normalises primaryEmail to lowercase", () => {
		const result = clientSchema.safeParse(
			makePf({ primaryEmail: "JOAO@EXAMPLE.COM" }),
		);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.primaryEmail).toBe("joao@example.com");
		}
	});

	it("rejects invalid primaryEmail", () => {
		const result = clientSchema.safeParse(
			makePf({ primaryEmail: "not-an-email" }),
		);
		expect(result.success).toBe(false);
	});

	it("rejects primaryPhone with wrong length", () => {
		const result = clientSchema.safeParse(makePf({ primaryPhone: "119876" }));
		expect(result.success).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// archiveClientSchema
// ---------------------------------------------------------------------------

describe("archiveClientSchema", () => {
	it("accepts a non-empty clientId", () => {
		const result = archiveClientSchema.safeParse({ clientId: "abc123" });
		expect(result.success).toBe(true);
	});

	it("rejects empty clientId", () => {
		const result = archiveClientSchema.safeParse({ clientId: "" });
		expect(result.success).toBe(false);
	});

	it("rejects missing clientId", () => {
		const result = archiveClientSchema.safeParse({});
		expect(result.success).toBe(false);
	});
});
