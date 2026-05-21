import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "./token";

describe("generateToken", () => {
	it("returns a 43-char base64url string (32 bytes encoded)", () => {
		const token = generateToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	it("returns different values on each call", () => {
		expect(generateToken()).not.toBe(generateToken());
	});
});

describe("hashToken", () => {
	it("returns a 64-char hex string", () => {
		expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic", () => {
		expect(hashToken("same")).toBe(hashToken("same"));
	});

	it("produces different hashes for different inputs", () => {
		expect(hashToken("a")).not.toBe(hashToken("b"));
	});
});
