"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

// Provides a way for individual admin pages (Server Components) to override
// breadcrumb labels for dynamic URL segments — typically a resource id that
// the breadcrumb path-walker would otherwise render verbatim.
//
// Pattern:
//   - `[id]/page.tsx` (server) renders <BreadcrumbOverride segment={id} label={name} />
//   - <AdminBreadcrumb /> reads overrides from context and substitutes labels.
//
// Trade-off: on first paint the breadcrumb renders the raw segment; once the
// page's client tree hydrates and the effect fires, the label is replaced.
// The flicker is acceptable for an authenticated admin shell.

type OverridesMap = Record<string, string>;

type ContextValue = {
	overrides: OverridesMap;
	setOverride: (segment: string, label: string) => void;
	clearOverride: (segment: string) => void;
};

const BreadcrumbOverridesContext = createContext<ContextValue | null>(null);

export function BreadcrumbOverridesProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [overrides, setOverrides] = useState<OverridesMap>({});

	const setOverride = useCallback((segment: string, label: string) => {
		setOverrides((prev) =>
			prev[segment] === label ? prev : { ...prev, [segment]: label },
		);
	}, []);

	const clearOverride = useCallback((segment: string) => {
		setOverrides((prev) => {
			if (!(segment in prev)) return prev;
			const next = { ...prev };
			delete next[segment];
			return next;
		});
	}, []);

	const value = useMemo<ContextValue>(
		() => ({ overrides, setOverride, clearOverride }),
		[overrides, setOverride, clearOverride],
	);

	return (
		<BreadcrumbOverridesContext.Provider value={value}>
			{children}
		</BreadcrumbOverridesContext.Provider>
	);
}

export function useBreadcrumbOverrides(): OverridesMap {
	return useContext(BreadcrumbOverridesContext)?.overrides ?? {};
}

/**
 * Registers a label override for a single breadcrumb segment (typically a
 * dynamic resource id). Mount this in a Server Component page anywhere below
 * <BreadcrumbOverridesProvider /> and the matching segment in the URL will be
 * rendered with `label` instead of its raw value.
 */
export function BreadcrumbOverride({
	segment,
	label,
}: {
	segment: string;
	label: string;
}) {
	const ctx = useContext(BreadcrumbOverridesContext);
	const setOverride = ctx?.setOverride;
	const clearOverride = ctx?.clearOverride;

	// Depend on the stable useCallback refs, NOT on `ctx` itself — `ctx` is a
	// fresh object every time `overrides` changes, which would cause the effect
	// to cleanup-and-resetup in a loop (cleanup deletes the key, setup re-adds
	// it, both mutating state).
	useEffect(() => {
		if (!setOverride || !clearOverride) return;
		setOverride(segment, label);
		return () => clearOverride(segment);
	}, [setOverride, clearOverride, segment, label]);

	return null;
}
