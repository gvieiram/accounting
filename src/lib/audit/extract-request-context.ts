import "server-only";

export type RequestContext = {
	ipAddress: string | null;
	userAgent: string | null;
};

export type RequestLike = Request | Headers | undefined;

export function extractRequestContext(source: RequestLike): RequestContext {
	if (!source) return { ipAddress: null, userAgent: null };
	const hdrs = source instanceof Headers ? source : source.headers;
	const forwardedFor = hdrs.get("x-forwarded-for");
	const realIp = hdrs.get("x-real-ip");
	const userAgent = hdrs.get("user-agent");

	let ipAddress: string | null = null;
	if (forwardedFor) {
		ipAddress = forwardedFor.split(",")[0]?.trim() ?? null;
	} else if (realIp) {
		ipAddress = realIp.trim();
	}

	return {
		ipAddress: ipAddress || null,
		userAgent: userAgent?.trim() || null,
	};
}
