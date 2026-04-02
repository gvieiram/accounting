import { type BannerConfig, bannerConfigSchema } from "../schemas/banner";

/**
 * Validates the raw flag JSON and checks time-window constraints.
 * Returns a typed `BannerConfig` when the banner should be visible,
 * or `null` when it should be hidden (invalid data, inactive, or
 * outside the date range).
 *
 * Dates are interpreted in BRT (UTC-3).
 */
export function resolveBanner(raw: unknown): BannerConfig | null {
	const result = bannerConfigSchema.safeParse(raw);
	if (!result.success) return null;

	const config = result.data;
	if (!config.active) return null;

	const now = new Date();

	if (config.startDate) {
		const start = new Date(`${config.startDate}T00:00:00-03:00`);
		if (now < start) return null;
	}

	if (config.endDate) {
		const end = new Date(`${config.endDate}T23:59:59.999-03:00`);
		if (now > end) return null;
	}

	return config;
}
