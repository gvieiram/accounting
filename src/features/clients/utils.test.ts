import { describe, expect, it } from "vitest";
import { ClientType } from "@/generated/prisma/enums";
import {
	cnpjRoot,
	computeDiff,
	formatCep,
	formatCnpj,
	formatCpf,
	formatDocument,
	formatPhoneBR,
	isMatrizCnpj,
	isValidCnpj,
	isValidCpf,
	stripDocument,
} from "./utils";

// ---------------------------------------------------------------------------
// stripDocument
// ---------------------------------------------------------------------------

describe("stripDocument", () => {
	it("removes all non-digit chars", () => {
		expect(stripDocument("111.444.777-35")).toBe("11144477735");
	});

	it("removes dots, slashes and hyphens from CNPJ format", () => {
		expect(stripDocument("11.222.333/0001-81")).toBe("11222333000181");
	});

	it("returns empty string for all non-digits", () => {
		expect(stripDocument("abc.-/")).toBe("");
	});

	it("keeps already-clean strings unchanged", () => {
		expect(stripDocument("12345678")).toBe("12345678");
	});
});

// ---------------------------------------------------------------------------
// formatCpf
// ---------------------------------------------------------------------------

describe("formatCpf", () => {
	it("formats 11-digit string", () => {
		expect(formatCpf("11144477735")).toBe("111.444.777-35");
	});

	it("falls back to raw value for partial input", () => {
		expect(formatCpf("1114447")).toBe("1114447");
	});

	it("formats already-stripped digits", () => {
		expect(formatCpf("00000000191")).toBe("000.000.001-91");
	});
});

// ---------------------------------------------------------------------------
// formatCnpj
// ---------------------------------------------------------------------------

describe("formatCnpj", () => {
	it("formats 14-digit string", () => {
		expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
	});

	it("falls back to raw value for partial input", () => {
		expect(formatCnpj("1122233")).toBe("1122233");
	});
});

// ---------------------------------------------------------------------------
// formatDocument
// ---------------------------------------------------------------------------

describe("formatDocument", () => {
	it("routes PF to formatCpf", () => {
		expect(formatDocument(ClientType.PF, "11144477735")).toBe("111.444.777-35");
	});

	it("routes PJ to formatCnpj", () => {
		expect(formatDocument(ClientType.PJ, "11222333000181")).toBe(
			"11.222.333/0001-81",
		);
	});

	it("falls back for partial PF input", () => {
		expect(formatDocument(ClientType.PF, "111")).toBe("111");
	});

	it("falls back for partial PJ input", () => {
		expect(formatDocument(ClientType.PJ, "1122233")).toBe("1122233");
	});
});

// ---------------------------------------------------------------------------
// formatPhoneBR
// ---------------------------------------------------------------------------

describe("formatPhoneBR", () => {
	it("formats 10-digit landline", () => {
		expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
	});

	it("formats 11-digit mobile", () => {
		expect(formatPhoneBR("11988887777")).toBe("(11) 98888-7777");
	});

	it("falls back for other lengths", () => {
		expect(formatPhoneBR("11988")).toBe("11988");
	});

	it("strips non-digits before formatting", () => {
		expect(formatPhoneBR("(11) 98888-7777")).toBe("(11) 98888-7777");
	});
});

// ---------------------------------------------------------------------------
// formatCep
// ---------------------------------------------------------------------------

describe("formatCep", () => {
	it("formats 8-digit CEP", () => {
		expect(formatCep("01310100")).toBe("01310-100");
	});

	it("falls back for other lengths", () => {
		expect(formatCep("0131")).toBe("0131");
	});

	it("strips non-digits before formatting", () => {
		expect(formatCep("01310-100")).toBe("01310-100");
	});
});

// ---------------------------------------------------------------------------
// isValidCpf
// ---------------------------------------------------------------------------

describe("isValidCpf", () => {
	it("accepts known-valid CPF", () => {
		expect(isValidCpf("11144477735")).toBe(true);
	});

	it("rejects CPF that fails checksum", () => {
		expect(isValidCpf("12345678900")).toBe(false);
	});

	it("rejects all-equal sequences", () => {
		expect(isValidCpf("11111111111")).toBe(false);
		expect(isValidCpf("00000000000")).toBe(false);
		expect(isValidCpf("99999999999")).toBe(false);
	});

	it("rejects wrong length", () => {
		expect(isValidCpf("1114447773")).toBe(false);
		expect(isValidCpf("111444777350")).toBe(false);
	});

	it("strips formatting before validating", () => {
		expect(isValidCpf("111.444.777-35")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isValidCnpj
// ---------------------------------------------------------------------------

describe("isValidCnpj", () => {
	it("accepts known-valid CNPJ", () => {
		expect(isValidCnpj("11222333000181")).toBe(true);
	});

	it("rejects CNPJ that fails checksum", () => {
		expect(isValidCnpj("12345678000190")).toBe(false);
	});

	it("rejects all-equal sequences", () => {
		expect(isValidCnpj("00000000000000")).toBe(false);
		expect(isValidCnpj("11111111111111")).toBe(false);
	});

	it("rejects wrong length", () => {
		expect(isValidCnpj("1122233300018")).toBe(false);
		expect(isValidCnpj("112223330001810")).toBe(false);
	});

	it("strips formatting before validating", () => {
		expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// cnpjRoot
// ---------------------------------------------------------------------------

describe("cnpjRoot", () => {
	it("returns first 8 digits of stripped CNPJ", () => {
		expect(cnpjRoot("11222333000181")).toBe("11222333");
	});

	it("strips formatting before slicing", () => {
		expect(cnpjRoot("11.222.333/0001-81")).toBe("11222333");
	});

	it("works on partial input (does not validate length)", () => {
		expect(cnpjRoot("11222333")).toBe("11222333");
	});
});

// ---------------------------------------------------------------------------
// isMatrizCnpj
// ---------------------------------------------------------------------------

describe("isMatrizCnpj", () => {
	it("returns true when order is 0001", () => {
		expect(isMatrizCnpj("11222333000181")).toBe(true);
	});

	it("returns false when order is not 0001", () => {
		expect(isMatrizCnpj("11222333000281")).toBe(false);
	});

	it("strips formatting before checking", () => {
		expect(isMatrizCnpj("11.222.333/0001-81")).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// computeDiff
// ---------------------------------------------------------------------------

describe("computeDiff", () => {
	it("returns empty changedFields when objects are equal", () => {
		const obj = { a: 1, b: "foo" };
		const result = computeDiff(obj, { ...obj });
		expect(result.changedFields).toHaveLength(0);
		expect(result.metadata).toEqual({});
	});

	it("detects a changed value", () => {
		const before = { name: "Alice", age: 30 };
		const after = { name: "Alice", age: 31 };
		const { changedFields, metadata } = computeDiff(before, after);
		expect(changedFields).toEqual(["age"]);
		expect(metadata.age).toEqual({ from: 30, to: 31 });
	});

	it("detects a newly added key", () => {
		const before = { a: 1 } as Record<string, unknown>;
		const after = { a: 1, b: 2 } as Record<string, unknown>;
		const { changedFields } = computeDiff(before, after);
		expect(changedFields).toContain("b");
	});

	it("detects a removed key", () => {
		const before = { a: 1, b: 2 } as Record<string, unknown>;
		const after = { a: 1 } as Record<string, unknown>;
		const { changedFields } = computeDiff(before, after);
		expect(changedFields).toContain("b");
	});

	it("is key-order-insensitive (same content, different order → no diff)", () => {
		const before = { a: 1, b: 2 };
		const after = { b: 2, a: 1 };
		const { changedFields } = computeDiff(before, after);
		expect(changedFields).toHaveLength(0);
	});

	it("is key-order-insensitive for nested objects", () => {
		const before = { info: { x: 1, y: 2 } };
		const after = { info: { y: 2, x: 1 } };
		const { changedFields } = computeDiff(before, after);
		expect(changedFields).toHaveLength(0);
	});

	it("truncates long string values in metadata", () => {
		const longString = "a".repeat(600);
		const before = { notes: "short" } as Record<string, unknown>;
		const after = { notes: longString } as Record<string, unknown>;
		const { changedFields, metadata } = computeDiff(before, after);
		expect(changedFields).toContain("notes");
		const toValue = metadata.notes.to as string;
		expect(toValue.length).toBeLessThanOrEqual(502); // 500 chars + "…"
		expect(toValue.endsWith("…")).toBe(true);
	});

	it("does not truncate values within the limit", () => {
		const shortString = "a".repeat(50);
		const before = { notes: "" } as Record<string, unknown>;
		const after = { notes: shortString } as Record<string, unknown>;
		const { metadata } = computeDiff(before, after);
		expect(metadata.notes.to).toBe(shortString);
	});

	it("correctly diffs empty object vs single-key object", () => {
		const before = {} as Record<string, unknown>;
		const after = { key: "value" } as Record<string, unknown>;
		const { changedFields, metadata } = computeDiff(before, after);
		expect(changedFields).toContain("key");
		expect(metadata.key.from).toBeUndefined();
		expect(metadata.key.to).toBe("value");
	});

	it("treats null and undefined as different (explicit clear vs absent)", () => {
		const before = { field: null } as Record<string, unknown>;
		const after = { field: undefined } as Record<string, unknown>;
		const { changedFields } = computeDiff(before, after);
		expect(changedFields).toContain("field");
	});

	it("serialises object values to a stable string in metadata", () => {
		const before = { addr: { city: "SP", state: "SP" } };
		const after = { addr: { city: "RJ", state: "RJ" } };
		const { changedFields, metadata } = computeDiff(before, after);
		expect(changedFields).toContain("addr");
		expect(typeof metadata.addr.from).toBe("string");
		expect(typeof metadata.addr.to).toBe("string");
	});
});
