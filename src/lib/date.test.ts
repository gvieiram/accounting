import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatRelative } from "./date";

describe("formatDate", () => {
	it("formats a date in pt-BR (dd/MM/yyyy)", () => {
		expect(formatDate(new Date("2026-04-27T15:00:00.000Z"))).toBe("27/04/2026");
	});
	it("returns empty string for null", () => {
		expect(formatDate(null)).toBe("");
	});
});

describe("formatDateTime", () => {
	it("formats a date+time in pt-BR (dd/MM/yyyy HH:mm)", () => {
		const result = formatDateTime(new Date("2026-04-27T15:30:00.000Z"));
		expect(result).toMatch(/^27\/04\/2026 \d{2}:30$/);
	});
});

describe("formatRelative", () => {
	it("returns a pt-BR relative string for recent dates", () => {
		const date = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
		expect(formatRelative(date)).toMatch(/há/);
	});
});
