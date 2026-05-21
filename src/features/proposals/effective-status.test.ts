import { describe, expect, it } from "vitest";
import { effectiveStatus } from "./effective-status";

const now = new Date("2026-06-01T12:00:00Z");
const past = new Date("2026-05-01T12:00:00Z");
const future = new Date("2026-07-01T12:00:00Z");

describe("effectiveStatus", () => {
	it("returns terminal ACCEPTED as-is", () => {
		expect(effectiveStatus({ status: "ACCEPTED", expiresAt: past }, now)).toBe(
			"ACCEPTED",
		);
	});
	it("returns terminal DECLINED as-is", () => {
		expect(effectiveStatus({ status: "DECLINED", expiresAt: past }, now)).toBe(
			"DECLINED",
		);
	});
	it("returns terminal CANCELLED as-is", () => {
		expect(effectiveStatus({ status: "CANCELLED", expiresAt: past }, now)).toBe(
			"CANCELLED",
		);
	});
	it("returns EXPIRED as-is", () => {
		expect(effectiveStatus({ status: "EXPIRED", expiresAt: past }, now)).toBe(
			"EXPIRED",
		);
	});
	it("returns EXPIRED_PENDING when PUBLISHED but expiresAt passed", () => {
		expect(effectiveStatus({ status: "PUBLISHED", expiresAt: past }, now)).toBe(
			"EXPIRED_PENDING",
		);
	});
	it("returns EXPIRED_PENDING when SENT but expiresAt passed", () => {
		expect(effectiveStatus({ status: "SENT", expiresAt: past }, now)).toBe(
			"EXPIRED_PENDING",
		);
	});
	it("returns original when expiresAt is null", () => {
		expect(effectiveStatus({ status: "DRAFT", expiresAt: null }, now)).toBe(
			"DRAFT",
		);
	});
	it("returns original when expiresAt is future", () => {
		expect(
			effectiveStatus({ status: "PUBLISHED", expiresAt: future }, now),
		).toBe("PUBLISHED");
	});
	it("returns DRAFT as-is regardless of expiresAt", () => {
		expect(effectiveStatus({ status: "DRAFT", expiresAt: past }, now)).toBe(
			"DRAFT",
		);
	});
});
