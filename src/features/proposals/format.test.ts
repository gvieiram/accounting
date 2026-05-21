import { describe, expect, it } from "vitest";
import { formatBRL, formatDateBR } from "./format";

// Intl.NumberFormat for pt-BR emits a non-breaking space (U+00A0)
// between the currency symbol and the digits.
const NBSP = " ";

describe("formatBRL", () => {
	it("formats integer as BRL", () => {
		expect(formatBRL(1500)).toBe(`R$${NBSP}1.500,00`);
	});

	it("formats decimal as BRL with 2 places", () => {
		expect(formatBRL(1234.5)).toBe(`R$${NBSP}1.234,50`);
	});

	it("formats zero as BRL", () => {
		expect(formatBRL(0)).toBe(`R$${NBSP}0,00`);
	});

	it("formats large value as BRL with grouping", () => {
		expect(formatBRL(1234567.89)).toBe(`R$${NBSP}1.234.567,89`);
	});

	it("returns empty string for null", () => {
		expect(formatBRL(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatBRL(undefined)).toBe("");
	});
});

describe("formatDateBR", () => {
	it("formats Date to dd/MM/yyyy", () => {
		expect(formatDateBR(new Date("2026-05-19T12:00:00Z"))).toBe("19/05/2026");
	});

	it("formats ISO string to dd/MM/yyyy", () => {
		expect(formatDateBR("2026-12-31T23:59:59Z")).toBe("31/12/2026");
	});

	it("returns empty string for null", () => {
		expect(formatDateBR(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatDateBR(undefined)).toBe("");
	});
});
