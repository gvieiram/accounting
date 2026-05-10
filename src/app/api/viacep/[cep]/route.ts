import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/helpers";
import { viaCepRateLimitByUser } from "@/lib/ratelimit";
import { lookupCep } from "@/lib/viacep";

// biome-ignore lint/style/useNamingConvention: Next.js requires uppercase HTTP method exports
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ cep: string }> },
) {
	const session = await requireAdmin();
	const limit = await viaCepRateLimitByUser.limit(session.user.id);
	if (!limit.success) {
		return NextResponse.json(
			{ ok: false, reason: "rate_limited" },
			{ status: 429 },
		);
	}
	const { cep } = await params;
	const result = await lookupCep(cep);
	return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
