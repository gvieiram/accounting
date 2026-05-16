import "server-only";

export type RequestContext = {
	ipAddress: string | null;
	userAgent: string | null;
};

export type RequestLike = Request | Headers | undefined;

const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

/**
 * Best-effort check that a string looks like a public IP address.
 *
 * Intentionally permissive: the goal is to reject obvious garbage from
 * spoofed `x-forwarded-for` headers or attacker-supplied audit metadata,
 * not to enforce RFC compliance.
 */
export function looksLikeIp(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > 45) return false;

	const v4 = IPV4_REGEX.exec(trimmed);
	if (v4) {
		return v4.slice(1).every((octet) => {
			const n = Number(octet);
			return Number.isInteger(n) && n >= 0 && n <= 255;
		});
	}

	return IPV6_REGEX.test(trimmed) && trimmed.includes(":");
}

export function extractRequestContext(source: RequestLike): RequestContext {
	if (!source) return { ipAddress: null, userAgent: null };
	const hdrs = source instanceof Headers ? source : source.headers;
	const forwardedFor = hdrs.get("x-forwarded-for");
	const realIp = hdrs.get("x-real-ip");
	const userAgent = hdrs.get("user-agent");

	let ipAddress: string | null = null;
	if (forwardedFor) {
		const firstHop = forwardedFor.split(",")[0]?.trim();
		if (firstHop && looksLikeIp(firstHop)) {
			ipAddress = firstHop;
		}
	} else if (realIp) {
		const trimmed = realIp.trim();
		if (looksLikeIp(trimmed)) {
			ipAddress = trimmed;
		}
	}

	return {
		ipAddress,
		userAgent: userAgent?.trim() || null,
	};
}
