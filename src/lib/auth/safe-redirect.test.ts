// @vitest-environment node

import { describe, expect, it } from "vitest";

import { safeNext } from "./safe-redirect";

describe("safeNext (ADMIN)", () => {
	it("returns /admin when next is undefined", () => {
		expect(safeNext(undefined, "ADMIN")).toBe("/admin");
	});

	it("returns /admin when next is null", () => {
		expect(safeNext(null, "ADMIN")).toBe("/admin");
	});

	it("returns /admin when next is an empty string", () => {
		expect(safeNext("", "ADMIN")).toBe("/admin");
	});

	it("returns /admin for the exact path /admin", () => {
		expect(safeNext("/admin", "ADMIN")).toBe("/admin");
	});

	it("preserves whitelisted /admin/* paths", () => {
		expect(safeNext("/admin/clients", "ADMIN")).toBe("/admin/clients");
	});

	it("preserves nested /admin/* paths", () => {
		expect(safeNext("/admin/clients/123", "ADMIN")).toBe("/admin/clients/123");
	});

	it("preserves the query string on whitelisted paths", () => {
		expect(safeNext("/admin/clients?status=active", "ADMIN")).toBe(
			"/admin/clients?status=active",
		);
	});

	it("strips the fragment from whitelisted paths", () => {
		expect(safeNext("/admin/clients#hash", "ADMIN")).toBe("/admin/clients");
	});

	it("falls back to /admin for the homepage", () => {
		expect(safeNext("/", "ADMIN")).toBe("/admin");
	});

	it("falls back to /admin for marketing routes", () => {
		expect(safeNext("/imposto-de-renda", "ADMIN")).toBe("/admin");
	});

	it("rejects absolute URLs (https scheme)", () => {
		expect(safeNext("https://evil.com/admin", "ADMIN")).toBe("/admin");
	});

	it("rejects protocol-relative URLs", () => {
		expect(safeNext("//evil.com/admin", "ADMIN")).toBe("/admin");
	});

	it("rejects backslash-prefixed paths", () => {
		expect(safeNext("/\\evil.com", "ADMIN")).toBe("/admin");
	});

	it("rejects backslashes anywhere in the input", () => {
		expect(safeNext("/admin\\evil.com", "ADMIN")).toBe("/admin");
	});

	it("rejects javascript: pseudo-URLs", () => {
		expect(safeNext("javascript:alert(1)", "ADMIN")).toBe("/admin");
	});

	it("rejects data: pseudo-URLs", () => {
		expect(safeNext("data:text/html,<script>alert(1)</script>", "ADMIN")).toBe(
			"/admin",
		);
	});

	it("rejects paths that share the /admin prefix but are not under it", () => {
		expect(safeNext("/administration", "ADMIN")).toBe("/admin");
	});

	// Dot-segment traversal vectors. The browser normalises `..` segments
	// per RFC 3986 §5.2 when following the `Location` header — the naive
	// `startsWith("/admin/")` check would let these pass, then the browser
	// would land on the attacker host. The URL-constructor normalisation
	// in `safeNext` collapses them before the allow-list runs.

	it("rejects dot-segment escape to protocol-relative (..//host)", () => {
		expect(safeNext("/admin/..//evil.com", "ADMIN")).toBe("/admin");
	});

	it("rejects dot-segment escape to a sibling path", () => {
		expect(safeNext("/admin/../../evil", "ADMIN")).toBe("/admin");
	});

	it("rejects deeply nested dot-segment escape", () => {
		expect(safeNext("/admin/x/../../../evil", "ADMIN")).toBe("/admin");
	});

	it("rejects encoded dot-segments (%2E%2E)", () => {
		expect(safeNext("/admin/%2E%2E/evil", "ADMIN")).toBe("/admin");
	});

	it("rejects mixed encoded dot-segments (.%2E)", () => {
		expect(safeNext("/admin/.%2E/evil", "ADMIN")).toBe("/admin");
	});
});

describe("safeNext (CLIENT)", () => {
	it("returns /app when next is undefined", () => {
		expect(safeNext(undefined, "CLIENT")).toBe("/app");
	});

	it("returns /app when next is null", () => {
		expect(safeNext(null, "CLIENT")).toBe("/app");
	});

	it("returns /app for the exact path /app", () => {
		expect(safeNext("/app", "CLIENT")).toBe("/app");
	});

	it("preserves whitelisted /app/* paths", () => {
		expect(safeNext("/app/dashboard", "CLIENT")).toBe("/app/dashboard");
	});

	it("preserves nested /app/* paths", () => {
		expect(safeNext("/app/dashboard/orders", "CLIENT")).toBe(
			"/app/dashboard/orders",
		);
	});

	it("preserves the query string on whitelisted paths", () => {
		expect(safeNext("/app/dashboard?tab=overview", "CLIENT")).toBe(
			"/app/dashboard?tab=overview",
		);
	});

	it("falls back to /app for the homepage", () => {
		expect(safeNext("/", "CLIENT")).toBe("/app");
	});

	it("falls back to /app for marketing routes", () => {
		expect(safeNext("/imposto-de-renda", "CLIENT")).toBe("/app");
	});

	it("rejects absolute URLs", () => {
		expect(safeNext("https://evil.com/app", "CLIENT")).toBe("/app");
	});
});

// Cross-role rejection: a path that's structurally valid but belongs to
// the wrong sub-tree must fall back to the role's default destination.
// This is defence-in-depth — the destination layout's `requireAdmin`
// would also reject mismatches, but rejecting earlier avoids a wasted
// redirect hop and a brief flicker on the protected route.
describe("safeNext — cross-role rejection", () => {
	it("CLIENT trying to reach /admin/* falls back to /app", () => {
		expect(safeNext("/admin/clients", "CLIENT")).toBe("/app");
	});

	it("CLIENT trying to reach exact /admin falls back to /app", () => {
		expect(safeNext("/admin", "CLIENT")).toBe("/app");
	});

	it("ADMIN with a /app/* next falls back to /admin", () => {
		expect(safeNext("/app/dashboard", "ADMIN")).toBe("/admin");
	});

	it("ADMIN with exact /app falls back to /admin", () => {
		expect(safeNext("/app", "ADMIN")).toBe("/admin");
	});

	it("ADMIN with /admin/* still resolves normally", () => {
		expect(safeNext("/admin/clients", "ADMIN")).toBe("/admin/clients");
	});

	it("CLIENT with /app/* still resolves normally", () => {
		expect(safeNext("/app/dashboard", "CLIENT")).toBe("/app/dashboard");
	});
});
