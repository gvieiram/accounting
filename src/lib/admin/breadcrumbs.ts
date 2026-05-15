// Pure helper — no I/O, no `import "server-only"`. The breadcrumb trail
// is rendered by a Client Component (`<AdminBreadcrumb />`) that reads
// `usePathname()` and feeds it here, so the same logic must run in both
// runtimes.

import type { messages as Messages } from "@/content/messages";

export type BreadcrumbItem = {
	label: string;
	href?: string;
};

/**
 * Resolves the breadcrumb trail for an admin pathname.
 *
 * - `/admin` → [{ label: "Dashboard" }]
 * - `/admin/clients` → [{ label: "Dashboard", href: "/admin" }, { label: "Clientes" }]
 * - `/admin/clients/new` → [{ label: "Dashboard", href: "/admin" },
 *                          { label: "Clientes", href: "/admin/clients" },
 *                          { label: "Novo" }]
 *
 * Unknown segments fall through with the raw segment as label so we don't
 * crash on a route we forgot to register.
 */
export function getBreadcrumbs(
	pathname: string,
	msgs: typeof Messages,
	overrides: Record<string, string> = {},
): BreadcrumbItem[] {
	const segments = pathname.split("/").filter(Boolean);
	if (segments[0] !== "admin") return [];

	const items: BreadcrumbItem[] = [];
	const isRoot = segments.length === 1;
	items.push(
		isRoot
			? { label: msgs.admin.breadcrumb.root }
			: { label: msgs.admin.breadcrumb.root, href: "/admin" },
	);

	let acc = "/admin";
	for (let i = 1; i < segments.length; i++) {
		const segment = segments[i];
		if (!segment) continue;
		acc = `${acc}/${segment}`;
		const isLast = i === segments.length - 1;
		const label = overrides[segment] ?? resolveSegmentLabel(segment, msgs);
		items.push(isLast ? { label } : { label, href: acc });
	}

	return items;
}

function resolveSegmentLabel(segment: string, msgs: typeof Messages): string {
	const map = msgs.admin.breadcrumb.segments;
	// Type-safe lookup with fallback to the raw segment so unknown
	// segments are still readable (e.g. `clients/abc-123` → "abc-123"
	// until a page registers a dynamic label override).
	return (map as Record<string, string | undefined>)[segment] ?? segment;
}
