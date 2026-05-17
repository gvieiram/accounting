import { describe, expect, it } from "vitest";
import { loginSchema } from "./schemas";

describe("loginSchema", () => {
	it("accepts a valid email", () => {
		const r = loginSchema.safeParse({ email: "a@b.com" });
		expect(r.success).toBe(true);
	});

	it("rejects emails over 254 chars (RFC 5321)", () => {
		const long = `${"a".repeat(249)}@b.com`;
		const r = loginSchema.safeParse({ email: long });
		expect(r.success).toBe(false);
	});

	it("rejects malformed emails", () => {
		const r = loginSchema.safeParse({ email: "not-an-email" });
		expect(r.success).toBe(false);
	});

	it("accepts a relative `next` path", () => {
		const r = loginSchema.safeParse({
			email: "a@b.com",
			next: "/admin/clients",
		});
		expect(r.success).toBe(true);
		if (r.success) expect(r.data.next).toBe("/admin/clients");
	});

	it("rejects `next` that does not start with /", () => {
		const r = loginSchema.safeParse({
			email: "a@b.com",
			next: "https://evil.com",
		});
		expect(r.success).toBe(false);
	});

	it("rejects `next` that starts with //", () => {
		const r = loginSchema.safeParse({
			email: "a@b.com",
			next: "//evil.com/admin",
		});
		expect(r.success).toBe(false);
	});
});
