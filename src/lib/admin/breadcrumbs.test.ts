import { describe, expect, it } from "vitest";

import { getBreadcrumbs } from "./breadcrumbs";

// Minimal mock — keeps the test independent from the full content tree.
// Cast lines below cast it to `typeof messages` so we exercise the
// real call site without dragging the entire content module in.
const mockMessages = {
	admin: {
		breadcrumb: {
			root: "Dashboard",
			segments: {
				clients: "Clientes",
				users: "Usuários",
				settings: "Configurações",
				new: "Novo",
				edit: "Editar",
			},
		},
	},
} as unknown as Parameters<typeof getBreadcrumbs>[1];

describe("getBreadcrumbs", () => {
	it("returns a single item for the admin root", () => {
		const items = getBreadcrumbs("/admin", mockMessages);
		expect(items).toHaveLength(1);
		expect(items[0]).toEqual({ label: "Dashboard" });
		expect(items[0]?.href).toBeUndefined();
	});

	it("returns two items for a top-level admin route", () => {
		const items = getBreadcrumbs("/admin/clients", mockMessages);
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "Clientes" },
		]);
	});

	it("returns three items for a nested admin route", () => {
		const items = getBreadcrumbs("/admin/clients/new", mockMessages);
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "Clientes", href: "/admin/clients" },
			{ label: "Novo" },
		]);
	});

	it("falls back to the raw segment when unknown", () => {
		const items = getBreadcrumbs("/admin/something-unknown", mockMessages);
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "something-unknown" },
		]);
	});

	it("propagates raw dynamic segments (e.g. id) when no override is provided", () => {
		const items = getBreadcrumbs("/admin/clients/abc-123", mockMessages);
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "Clientes", href: "/admin/clients" },
			{ label: "abc-123" },
		]);
	});

	it("substitutes a dynamic segment with the matching override label", () => {
		const items = getBreadcrumbs("/admin/clients/abc-123", mockMessages, {
			"abc-123": "Empresa Acme Ltda",
		});
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "Clientes", href: "/admin/clients" },
			{ label: "Empresa Acme Ltda" },
		]);
	});

	it("ignores overrides that do not match any segment in the path", () => {
		const items = getBreadcrumbs("/admin/clients", mockMessages, {
			"abc-123": "Empresa Acme Ltda",
		});
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "Clientes" },
		]);
	});

	it("returns an empty array for non-admin paths", () => {
		expect(getBreadcrumbs("/", mockMessages)).toEqual([]);
		expect(getBreadcrumbs("/marketing", mockMessages)).toEqual([]);
		expect(getBreadcrumbs("", mockMessages)).toEqual([]);
	});

	it("handles trailing slashes gracefully", () => {
		const items = getBreadcrumbs("/admin/clients/", mockMessages);
		expect(items).toEqual([
			{ label: "Dashboard", href: "/admin" },
			{ label: "Clientes" },
		]);
	});
});
