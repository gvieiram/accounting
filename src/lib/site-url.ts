/**
 * Resolves the canonical site URL used for SEO artefacts (JSON-LD, OG
 * images, sitemap) and email templates.
 *
 * Reads `process.env` directly so it can run in contexts that do not go
 * through `@/lib/env` validation — notably the `react-email` preview binary,
 * which bundles templates in isolation and does not load server env schemas.
 *
 * Resolution order — gated by `VERCEL_ENV` because `VERCEL_URL` is the
 * hash-suffixed unique deploy URL in *every* environment (including
 * production). Preferring it unconditionally — as a prior revision did —
 * caused magic-link emails and OG metadata in production to point at
 * `duohub-<hash>-duohub.vercel.app` instead of the canonical domain.
 *
 * - Override (any env): `NEXT_PUBLIC_SITE_URL` wins.
 * - Production: `VERCEL_PROJECT_PRODUCTION_URL` (canonical domain set in
 *   the project) → `VERCEL_URL` only as a last resort.
 * - Preview: `VERCEL_URL` (so this preview deploy is self-targeting for
 *   JSON-LD debugging and preview email assets) → `VERCEL_PROJECT_PRODUCTION_URL`.
 * - Other / unset (local dev, tests): `VERCEL_URL` →
 *   `VERCEL_PROJECT_PRODUCTION_URL` → `http://localhost:3000`.
 */
export function getSiteUrl(): string {
	const override = process.env.NEXT_PUBLIC_SITE_URL;
	if (override) {
		return stripTrailingSlash(override);
	}

	const env = process.env.VERCEL_ENV;
	const vercelUrl = process.env.VERCEL_URL;
	const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

	if (env === "production") {
		if (productionUrl) return `https://${productionUrl}`;
		if (vercelUrl) return `https://${vercelUrl}`;
	} else {
		if (vercelUrl) return `https://${vercelUrl}`;
		if (productionUrl) return `https://${productionUrl}`;
	}

	return "http://localhost:3000";
}

function stripTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}
