import { describe, expect, it } from "vitest";
import { normalizeDocument } from "./normalize-document";

describe("normalizeDocument", () => {
	it("strips CPF separators", () => {
		expect(normalizeDocument("123.456.789-09")).toBe("12345678909");
	});
	it("strips CNPJ separators", () => {
		expect(normalizeDocument("12.345.678/0001-90")).toBe("12345678000190");
	});
	it("leaves digits-only unchanged", () => {
		expect(normalizeDocument("12345678909")).toBe("12345678909");
	});
	it("strips spaces", () => {
		expect(normalizeDocument(" 12 . 345 ")).toBe("12345");
	});
	it("returns empty for empty input", () => {
		expect(normalizeDocument("")).toBe("");
	});
	it("strips any non-digit", () => {
		expect(normalizeDocument("abc123")).toBe("123");
	});
});
